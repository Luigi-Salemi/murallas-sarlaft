---
name: backlog-dispatcher-github-source
description: GitHub Issues source primitives for the scheduled Backlog Dispatcher. Defines the list-candidates search (newest-first), the field map the rubric needs, the label-apply / label-swap / post-failure-comment write primitives, and the read-pr-status / read-pr-activity / close-stale-pr primitives the scan loop uses to maintain the VFS PR registry.
---
# GitHub Issues — source primitives

This skill is a **leaf** (no nested includes). It is used by the
scan loop. The expert prompt sets these context values:

- `GITHUB_REPOS` — list of `owner/repo` slugs to scan (e.g.
  `["augmentcode/augment", "augmentcode/cli"]`). Required.
- `MAX_CANDIDATES_PER_SOURCE` — listing cap (default `25`).

Required tool: a GitHub REST tool. Both `github-api` (user-attributed,
provided by the `GITHUB` capability) and `github-app-api`
(bot-attributed, provided by `GITHUB_APP`) work. **Prefer `github-api`
when it is available** so dispatcher-created PRs, label changes, and
stale-PR comments are attributed to the operator and show up in their
GitHub dashboards (issues / PRs / Mentions). Fall back to
`github-app-api` if `github-api` is unavailable.

# list-candidates

For each `owner/repo` in `GITHUB_REPOS`:

```
GET /search/issues?q=repo:<owner>/<repo>+is:issue+is:open
    +-label:cosmos-dispatched
    +-label:cosmos-skipped
    +-label:cosmos-dispatch-failed
    &per_page=<MAX_CANDIDATES_PER_SOURCE>&sort=created&order=desc
```

(Encode `+` as `%20` in the actual URL; the form above is for clarity.)

`order=desc` makes the listing newest-first — the scan loop wants the
freshest tickets on a busy backlog.

There is intentionally no other label filter — the rubric will read
each ticket (title, body, labels) and judge. The scan loop's settling
and human-activity filters apply on top.

# Field map (per ticket)

For each item in the search result:

- `<TICKET_URL>` = `html_url`
- `<TICKET_TITLE>` = `title`
- `<ONE_TO_THREE_SENTENCE_SUMMARY>` = your distillation of `body`
- `<EVIDENCE_QUOTED_OR_SUMMARISED>` = the most concrete signal from
  the body — repro steps, stack trace, acceptance example, or a
  quoted snippet. Empty if there isn't one (which itself is a
  Skip-path signal for the rubric).
- `<BEST_EFFORT_AREA>` = whatever subdir/component the body points
  at; if you cannot name one with reasonable confidence, that is
  itself a Skip-path signal.
- `<REQUESTER_NAME>` = `@<user.login>` (the issue reporter's GitHub
  handle, with a leading `@` so the PR body renders a clickable
  GitHub mention).
- `<REQUESTER_LINK>` = `user.html_url` (the reporter's GitHub
  profile URL). Search-issues returns `user.login` and
  `user.html_url` inline — no extra request needed.
- The ticket's `labels` array is available to the rubric as a soft
  signal — pass it through to the rubric's judgement, do not use it
  as a filter.

The `repository_url` on a search-issues result is an API URL; derive
`owner/repo` from `html_url` for any subsequent calls.

To check the human-activity filter (recent non-bot comment):

```
GET /repos/{owner}/{repo}/issues/{number}/comments
    ?per_page=20&sort=created&direction=desc
```

`sort=created&direction=desc` is required — the endpoint defaults to
ascending order, which would return the **oldest** 20 comments and
silently miss recent activity on busy tickets.

Drop the candidate if any comment in the last 30 minutes was authored
by a non-bot user.

# apply-label (idempotent)

Used by the scan loop to mark the ticket. Adds the label, creating
the label on the repo if it doesn't already exist.

1. **Ensure the label exists on the repo.** This is one-shot per repo
   per session — cache the answer in your working memory:

   ```
   POST /repos/{owner}/{repo}/labels
   body: { "name": "<label>", "color": "<color>",
           "description": "Set by Backlog Dispatcher" }
   ```

   - On `201` → created.
   - On `422` with `"already_exists"` → fine, ignore.
   - Any other error → log and skip this ticket.

   Suggested colors: `cosmos-dispatched` = `0e8a16` (green),
   `cosmos-skipped` = `cccccc` (grey),
   `cosmos-dispatch-failed` = `b60205` (red).

2. **Apply to the issue.** This call is additive — it does not
   replace existing labels:

   ```
   POST /repos/{owner}/{repo}/issues/{number}/labels
   body: { "labels": ["<label>"] }
   ```

   - On `200` → done.
   - On `404` → ticket gone; drop without further action.

# swap-label (failure path only)

Used by the scan loop when a dispatch-path worker reports failure. Removes
`cosmos-dispatched` and adds `cosmos-dispatch-failed`:

```
DELETE /repos/{owner}/{repo}/issues/{number}/labels/cosmos-dispatched
POST   /repos/{owner}/{repo}/issues/{number}/labels
body:  { "labels": ["cosmos-dispatch-failed"] }
```

If the `cosmos-dispatch-failed` label is missing on the repo,
ensure-label-exists per `apply-label` step 1 first.

# post-skip-comment (skip path)

Used by the scan loop on the skip path, paired with the
`cosmos-skipped` label. Posts **one** short Markdown comment carrying
the rubric's one-sentence skip reason:

```
POST /repos/{owner}/{repo}/issues/{number}/comments
body: { "body": "<COMMENT_HEADER>\n\nSkipped by Backlog Dispatcher.
                 Reason: <SKIP_REASON>" }
```

`<COMMENT_HEADER>` is the GitHub `<sup>` line per the kb
`comment-header` skill, using the role / emoji / `SESSION_URL` from
your expert context block. Keep the comment a single sentence — it's
an audit trail for adopters to calibrate the rubric, not a
conversation starter.

# post-failure-comment (failure path only)

Used by the scan loop when a dispatch-path worker reports failure. Posts
**one** short Markdown comment:

```
POST /repos/{owner}/{repo}/issues/{number}/comments
body: { "body": "<COMMENT_HEADER>\n\nPR Author was dispatched but
                 could not open a PR. Reason: <ONE_SENTENCE_REASON>.
                 Leaving for a human reviewer." }
```

`<COMMENT_HEADER>` is the GitHub `<sup>` line per the kb
`comment-header` skill, using the role / emoji / `SESSION_URL` from
your expert context block.

# read-pr-status

Used by the scan loop's Step 0 (registry refresh) and Step 6 (stale
sweep). Reads the live state of a dispatcher-owned PR:

```
GET /repos/{owner}/{repo}/pulls/{number}
```

Map the response to a registry `status`:

- `state == "open"` and `draft == false` → `open`
- `state == "open"` and `draft == true`  → `open` (still counts
  toward `MAX_OPEN_PRS` — it's a dispatcher-owned slot)
- `state == "closed"` and `merged == true`  → `merged`
- `state == "closed"` and `merged == false` → `closed`

On `404` (PR deleted), set `status: closed` in the registry file.

# read-pr-activity

Used by Step 6 to decide whether a registry-`open` PR is stale.
Returns the timestamp of the most recent commit, comment, or review:

```
GET /repos/{owner}/{repo}/pulls/{number}            # head.sha + updated_at
GET /repos/{owner}/{repo}/issues/{number}/comments  # PR conversation
GET /repos/{owner}/{repo}/pulls/{number}/comments   # review-line comments
GET /repos/{owner}/{repo}/pulls/{number}/reviews    # review submissions
GET /repos/{owner}/{repo}/commits/{head.sha}        # last commit author + date
```

The PR is **stale** if every one of those activity timestamps is
older than `STALE_PR_DAYS` days, **and** the most recent commit /
comment / review was authored by a bot or by the dispatcher's worker
identity (i.e. no human engagement). If a human has touched the PR
inside that window, leave it alone.

# close-stale-pr (stale sweep only)

Used by Step 6 when a PR is judged stale. Posts one short comment,
then closes the PR:

```
POST  /repos/{owner}/{repo}/issues/{number}/comments
body: { "body": "<COMMENT_HEADER>\n\nClosing this PR after
                <STALE_PR_DAYS> days of inactivity. Reopen if you
                want to pick it up." }

PATCH /repos/{owner}/{repo}/pulls/{number}
body: { "state": "closed" }
```

Do not delete the branch — leave that to whoever revisits the PR.

# Allowed GitHub operations (allowlist)

```
GET    /search/issues
GET    /repos/*/issues/*
GET    /repos/*/issues/*/comments
GET    /repos/*/pulls/*                   (read-pr-status, read-pr-activity)
GET    /repos/*/pulls/*/comments          (read-pr-activity)
GET    /repos/*/pulls/*/reviews           (read-pr-activity)
GET    /repos/*/commits/*                 (read-pr-activity)
POST   /repos/*/labels                    (ensure-label-exists)
POST   /repos/*/issues/*/labels           (apply-label)
DELETE /repos/*/issues/*/labels/*         (swap-label, failure path)
POST   /repos/*/issues/*/comments         (skip-reason, failure, stale-close)
PATCH  /repos/*/pulls/*                   (close-stale-pr — state:closed only)
```

No assignee changes, no closing the issue, no edits to issue body /
title / milestone, no PR title / body / label edits. PR creation
belongs to the worker; the dispatcher only reads PR state and (in
the stale sweep) closes inactive ones.

# Anti-patterns

- Adding the label **after** launching the worker — defeats the
  dedup. Always label first, launch second.
- Adding the `cosmos-skipped` label **after** posting the skip-reason
  comment — same race. Always label first, comment second.
- Posting a comment on dispatch-path success.
- Posting more than one comment on the skip path, dispatch-path failure,
  or stale-close.
- Calling `PUT /repos/.../labels` (replace-all) instead of
  `POST .../labels` (add) — replace-all would clobber the reporter's
  labels.
- Inferring `<BEST_EFFORT_AREA>` from a label like `team/backend` —
  that is org metadata, not a codebase pointer. Use only signals from
  the issue body.
- **Labelling a dispatcher-owned PR.** PR tracking lives in tenant
  VFS; never apply a `cosmos-*` label to a PR.
- **Editing a PR's title, body, or labels** in the stale sweep.
  Only `state: closed` is allowed.
