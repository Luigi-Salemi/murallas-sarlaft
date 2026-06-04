---
name: backlog-dispatcher-scan-loop
description: Scan loop for the scheduled Backlog Dispatcher. Refreshes the VFS PR registry, applies an in-flight backpressure cap, enumerates open tickets across configured GitHub repos and Linear teams (newest-first), applies settling/dedup filters and the dispatch rubric, dispatches PR Author workers within budget, records resulting PRs in VFS, waits for worker reports, then sweeps stale dispatcher-owned PRs.
---
# Scan loop

You are running on a **scheduled trigger**. There is no per-ticket
webhook. Each tick you:

0. Refresh the dispatcher's PR registry in VFS and compute this
   tick's Dispatch-path budget from the count of still-open dispatcher-
   owned PRs.
1. List candidate open tickets across configured sources, **newest
   first**.
2. Filter out tickets that are not yet ready (settling) or already
   touched by this expert (dedup via labels).
3. Apply the active rubric (loaded by your expert prompt) to decide
   the dispatch path or the skip path per ticket. For each Skip-path
   ticket, the rubric also produces a one-sentence `<SKIP_REASON>`.
4. Take the per-path action (skip path: label + skip-reason comment;
   dispatch path: label first, then launch a worker).
5. Wait for any launched workers to report, then handle their results
   (success → write a registry file; failure → label swap + comment).
6. Sweep stale dispatcher-owned PRs and close the inactive ones.

The expert prompt sets these context values, used below:

- `MAX_DISPATCHES_PER_RUN` — hard cap on Dispatch-path worker launches per
  source per tick (default `5` if not set).
- `MAX_CANDIDATES_PER_SOURCE` — hard cap on the listing size per
  source per tick (default `25` if not set).
- `MAX_OPEN_PRS` — global cap on dispatcher-owned PRs that are still
  open. Backpressure for human review capacity (default `10` if not
  set).
- `SETTLING_AGE_HOURS` — minimum ticket age before it is eligible
  (default `1` if not set).
- `STALE_PR_DAYS` — dispatcher-owned PRs that have been open and
  inactive for at least this many days are closed (default `7` if
  not set).
- `PR_REGISTRY_PATH` — VFS directory holding one YAML file per
  dispatcher-owned PR. Set by the expert prompt to match the
  expert's visibility (`tenant/...` for `visibility: tenant` —
  the canonical default — or `user/...` for `visibility: user`
  for personal/dev use).

# Step 0 — Refresh PR registry, compute budget

The PR registry is a directory of small YAML files in VFS, one per
dispatcher-owned PR. Path layout under `PR_REGISTRY_PATH`:

```
<PR_REGISTRY_PATH><owner>/<repo>/<pr_number>.yaml
```

Each file:

```yaml
pr_url:          https://github.com/<owner>/<repo>/pull/<n>
pr_number:       <n>
repo:            <owner>/<repo>
issue_url:       <ticket url>          # GitHub Issue or Linear url
issue_source:    github                  # github | linear
ticket_title:    "<title>"
opened_at:       2026-05-04T12:00:00Z
last_checked_at: 2026-05-04T15:00:00Z
status:          open                    # open | merged | closed | abandoned
```

This step:

1. **List** every file under `PR_REGISTRY_PATH` recursively. (Use the
   normal file tools — VFS is just a local directory.)
2. **For each file with `status: open`**, GET the live PR state from
   the source skill (`github-source.md` `read-pr-status`). Update the
   YAML in place: set `status` to `merged` / `closed` if the PR has
   moved on, refresh `last_checked_at` either way.
3. After the refresh, **count** files with `status: open`. Call this
   `open_pr_count`.
4. Compute this tick's Dispatch-path budget:

   ```
   dispatch_budget = max(0, MAX_OPEN_PRS - open_pr_count)
   ```

5. If `dispatch_budget == 0`, **skip Step 3's Dispatch-path action entirely
   for this tick** (you can still apply Skip-path `cosmos-skipped`
   labels — those don't consume a worker slot). Log one line noting
   the cap was hit and continue to Step 6.

The budget is approximate — concurrent ticks can both see the same
snapshot and overshoot by one or two. That is acceptable: the cap
is a backpressure signal for human review, not a hard quota.

# Step 1 — List candidates per source

Read each source skill that the expert prompt has included
(`github-source.md`, `linear-source.md`) and run its **list query**.
Each source skill returns up to `MAX_CANDIDATES_PER_SOURCE` open
tickets, **sorted newest-first by creation time**, that do **not**
carry any of `cosmos-dispatched`, `cosmos-skipped`,
`cosmos-dispatch-failed`. There is intentionally no other label
filter — the rubric reads each ticket and judges.

Run the sources sequentially (GitHub first, then Linear). If a source's
required tool is missing, skip that source with one short note and
continue.

# Step 2 — Per-ticket filters

For each candidate, drop it (without action, without label) if any of:

- **Too fresh.** Created less than `SETTLING_AGE_HOURS` hours ago.
- **Recent human activity.** A non-bot comment was posted in the last
  30 minutes, or the ticket has an assignee. Humans are still working
  the ticket; back off.
- **Closed/resolved between list and now.** The ticket has changed
  state since the listing call.

Surviving candidates are eligible. If more Dispatch-path candidates remain
than `min(MAX_DISPATCHES_PER_RUN, dispatch_budget)`, take the
**newest** first (they came back newest-first from Step 1) and defer
the rest — they will be reconsidered on the next tick. Skip-path
labellings are not capped by `dispatch_budget`.

# Step 3 — Apply the rubric

For each eligible ticket, build the placeholders the rubric's
worker-launch message asks for using the source skill's field map
(`<TICKET_URL>`, `<TICKET_TITLE>`,
`<ONE_TO_THREE_SENTENCE_SUMMARY>`, `<EVIDENCE_QUOTED_OR_SUMMARISED>`,
`<BEST_EFFORT_AREA>`).

Then run the rubric (loaded by the expert prompt) and pick a path.
For each Skip-path ticket, also produce a one-sentence `<SKIP_REASON>`
per the rubric — this is what the Step 4 skip-reason comment carries.

# Step 4 — Take the action

**Skip path.**

1. Use the source skill's `apply-label` step to add `cosmos-skipped`
   to the ticket *first*. The label is what the next tick's listing
   query excludes; it must land before the comment so a crash
   between the two doesn't leave a labelless ticket with a stray
   comment.
2. Use the source skill's `post-skip-comment` step to post **one**
   short comment carrying the rubric's `<SKIP_REASON>`. This is the
   audit trail adopters use to calibrate the rubric.

**Dispatch path.**

1. Use the source skill's `apply-label` step to add `cosmos-dispatched`
   to the ticket *first*. This claims the ticket so a concurrent run
   won't pick it up.
2. Launch one **PR Author (GitHub)** worker per Dispatch-path ticket using the
   message body in the rubric. Launch all of a tick's Dispatch-path workers
   in parallel — `worker-launch` returns immediately.
3. Do **not** post any comment yet.

# Step 5 — Handle worker reports

After all labels are applied and all workers launched in this tick,
worker reports will arrive as `<worker>` messages. Handle each as it
comes — do **not** loop on `worker-list`.

- **Success** (the report contains a PR URL):
  1. Leave the `cosmos-dispatched` label in place. Do **not** post a
     comment — the source platform's auto cross-reference (GitHub
     `Closes #N`, Linear `AU-1234` mention) is the link.
  2. **Write a registry file** at
     `<PR_REGISTRY_PATH><owner>/<repo>/<pr_number>.yaml` with the
     schema in Step 0. Set `status: open`, `opened_at` and
     `last_checked_at` to now (UTC, ISO-8601). This is what
     consumes a `dispatch_budget` slot on subsequent ticks.
- **Failure** (the worker reports it could not open a PR, or never
  sent a PR URL): use the source skill's `swap-label` step to remove
  `cosmos-dispatched` and add `cosmos-dispatch-failed`, then use
  `post-failure-comment` to post **one** short comment naming the
  failure reason in plain language. Do not write a registry file.

# Step 6 — Stale-PR sweep

After Step 5 (or alongside it, if no workers were launched this
tick), iterate registry files where `status: open` and
`opened_at < now - STALE_PR_DAYS`. For each:

1. Read the live PR state (`github-source.md` `read-pr-status`)
   and call `read-pr-activity` for the stale judgement. The source
   skill defines stale as "every activity timestamp older than
   `STALE_PR_DAYS` days **and** the most recent commit / comment /
   review was authored by a bot or by the dispatcher's worker
   identity" — i.e. recent bot-only activity (CI, dependabot, the
   worker itself) does **not** keep a PR alive.
2. If `read-pr-activity` reports the PR is **not stale** (a human
   has touched it inside the window), leave it alone and refresh
   `last_checked_at`.
3. Otherwise close the PR with a one-line comment via
   `close-stale-pr`, set `status: abandoned` in the registry file,
   and refresh `last_checked_at`.

The sweep is bounded by the registry size (≤ `MAX_OPEN_PRS` open
files). It is safe to run on every tick.

# Hard rules

- **Label first, then launch.** Never launch a worker before the
  `cosmos-dispatched` label is on the ticket — that is your dedup.
- **Label first, then comment.** On the skip path, the `cosmos-skipped`
  label must land before the skip-reason comment so a crash between
  the two doesn't leave a labelless ticket with a stray comment.
- **Refresh registry first, then dispatch.** Step 0 must complete
  before any Step 4 Dispatch-path action so the budget reflects reality.
- **Never label a PR.** Dispatcher-owned PRs are tracked in VFS
  only — keep the PR itself clean.
- **One short skip-reason comment on the skip path.** Always paired with
  the `cosmos-skipped` label.
- **No comment on Dispatch-path success.** The PR's cross-reference is the
  signal.
- **One comment, only on dispatch-path failure.** Always paired with the
  `cosmos-dispatch-failed` label swap.
- **One short close comment** when the stale sweep abandons a PR.
  No comment when a PR transitions to `merged` or human-`closed`.
- **Never** edit ticket title, body, assignee, milestone, or state.
  Labels, the skip-path skip-reason comment, and (rare) failure /
  stale-close comments only.
- Do **not** read the codebase. The PR Author worker reads the code.
- Do **not** ask the reporter clarifying questions.
- Cap launches per source per tick at `MAX_DISPATCHES_PER_RUN` and
  globally at `dispatch_budget`. The next tick picks up the rest.

# Idempotency

Two pieces of durable state, both checked before action:

- **Per-ticket triage state** — the three-label set (`cosmos-dispatched`,
  `cosmos-skipped`, `cosmos-dispatch-failed`) on the source ticket. The
  list query in step 1 excludes all three, so re-runs after a crash
  will not double-dispatch as long as the label was applied before the
  worker launched (step 4 / dispatch path).
- **Per-PR registry state** — one YAML file per dispatcher-owned PR
  in VFS (`PR_REGISTRY_PATH`). Writes are last-write-wins per file;
  concurrent ticks touching the same PR file is safe because they
  converge on the live GitHub state.
