---
name: backlog-dispatcher-linear-source
description: Linear source primitives for the scheduled Backlog Dispatcher. Defines the list-candidates GraphQL query (newest-first), the field map the rubric needs, and the label-apply / label-swap / post-failure-comment write primitives. PR-registry primitives live in the GitHub source skill — Linear PRs are out of scope.
---
# Linear — source primitives

This skill is a **leaf** (no nested includes). It is used by the
scan loop. The expert prompt sets these context values:

- `LINEAR_TEAM_KEYS` — list of team keys to scan (e.g.
  `["AU", "ENG"]`). Required.
- `MAX_CANDIDATES_PER_SOURCE` — listing cap (default `25`).

Required tool: a Linear GraphQL tool (provided by the `LINEAR_APP`
capability).

# list-candidates

For each team key in `LINEAR_TEAM_KEYS`:

```graphql
query {
  issues(
    first: <MAX_CANDIDATES_PER_SOURCE>,
    orderBy: createdAt,
    filter: {
      team: { key: { eq: "<TEAM_KEY>" } },
      state: { type: { in: ["unstarted", "backlog", "triage"] } },
      and: [
        { labels: { every: { name: { neq: "cosmos-dispatched" } } } },
        { labels: { every: { name: { neq: "cosmos-skipped" } } } },
        { labels: { every: { name: { neq: "cosmos-dispatch-failed" } } } }
      ]
    }
  ) {
    nodes {
      id identifier title description url createdAt
      assignee { id name }
      creator { id name displayName }
      state { name type }
      labels { nodes { id name } }
      team { id key name }
      comments(first: 20, orderBy: createdAt) {
        nodes { id body user { name } createdAt }
      }
    }
  }
}
```

`orderBy: createdAt` returns issues newest-first (the Linear API
sorts the chosen key in descending order). The scan loop wants the
freshest tickets on a busy backlog.

The label filters use `every: { ... }` (not the default `some`)
because we want issues where **every** label name differs from the
exclusion target — i.e. the exclusion target is absent. The default
`some` semantics would match any issue with at least one other label,
including ones that already carry a `cosmos-*` state label.

There is intentionally no other label filter — the rubric will read
each ticket and judge.

# Field map (per ticket)

For each node:

- `<TICKET_URL>` = `url` (use verbatim — workspace slugs drift)
- `<TICKET_TITLE>` = `title`
- `<ONE_TO_THREE_SENTENCE_SUMMARY>` = your distillation of `description`
- `<EVIDENCE_QUOTED_OR_SUMMARISED>` = the most concrete signal from
  the description — repro steps, stack trace, acceptance example,
  or a quoted snippet. Empty if there isn't one.
- `<BEST_EFFORT_AREA>` = whatever subdir/component the description
  points at; if you cannot name one with reasonable confidence,
  that is itself a Skip-path signal.
- `<REQUESTER_NAME>` = `creator.displayName` (fall back to
  `creator.name` if `displayName` is empty). The PR Author renders
  this as `Requested by: <name>` in the PR body. If `creator` is
  null (rare — ticket created by a deleted user or a non-user
  integration), omit and let the PR Author fall back to "no
  requester".
- `<REQUESTER_LINK>` = the ticket `url` (verbatim from the API —
  Linear users don't have public profile URLs, so the ticket URL is
  the most useful clickable target for a reviewer wanting to see
  who reported it).
- The `labels` array is available to the rubric as a soft signal —
  pass it through to the rubric's judgement, do not use it as a
  filter.

The scan loop's settling and human-activity filters apply on top:
drop a candidate if `assignee` is set, or if any comment in the last
30 minutes was authored by a non-bot user.

# apply-label (idempotent)

Linear labels are scoped to a team. Adding a label to an issue
requires the label's UUID and uses `issueAddLabel`:

1. **Resolve the label UUID for this team.** Cache per-team in your
   working memory:

   ```graphql
   query {
     issueLabels(filter: {
       team: { id: { eq: "<TEAM_ID>" } },
       name: { eq: "<label>" }
     }) { nodes { id name } }
   }
   ```

   If empty, create it:

   ```graphql
   mutation {
     issueLabelCreate(input: {
       teamId: "<TEAM_ID>",
       name: "<label>",
       color: "<color>",
       description: "Set by Backlog Dispatcher"
     }) { success issueLabel { id name } }
   }
   ```

   Suggested colors: `cosmos-dispatched` = `#0e8a16`,
   `cosmos-skipped` = `#cccccc`,
   `cosmos-dispatch-failed` = `#b60205`.

2. **Apply to the issue.** `issueAddLabel` is additive — it does not
   replace existing labels:

   ```graphql
   mutation {
     issueAddLabel(id: "<ISSUE_ID>", labelId: "<LABEL_ID>") {
       success
     }
   }
   ```

   Do **not** use `issueUpdate(input: { labelIds: [...] })` — that
   replaces the entire label set and would clobber the reporter's
   labels.

# swap-label (failure path only)

Used by the scan loop when a dispatch-path worker reports failure. Removes
`cosmos-dispatched` and adds `cosmos-dispatch-failed`:

```graphql
mutation {
  issueRemoveLabel(id: "<ISSUE_ID>", labelId: "<DISPATCHED_LABEL_ID>") {
    success
  }
}
```

then `apply-label` for `cosmos-dispatch-failed`.

# post-skip-comment (skip path)

Used by the scan loop on the skip path, paired with the
`cosmos-skipped` label. Posts **one** short Markdown comment carrying
the rubric's one-sentence skip reason via `commentCreate`:

```graphql
mutation {
  commentCreate(input: {
    issueId: "<ISSUE_ID>",
    body: "**Backlog Dispatcher** ([session](<SESSION_URL>)) on behalf of @<github_username>\n\nSkipped by Backlog Dispatcher. Reason: <SKIP_REASON>"
  }) { success comment { id url } }
}
```

Keep the comment a single sentence — it's an audit trail for
adopters to calibrate the rubric, not a conversation starter.
(Linear comments are Markdown; the GitHub `<sup>` wrapper is not
needed. Use bold + a session link.)

# post-failure-comment (failure path only)

Posts **one** short Markdown comment via `commentCreate`:

```graphql
mutation {
  commentCreate(input: {
    issueId: "<ISSUE_ID>",
    body: "**Backlog Dispatcher** ([session](<SESSION_URL>)) on behalf of @<github_username>\n\nPR Author was dispatched but could not open a PR. Reason: <ONE_SENTENCE_REASON>. Leaving for a human reviewer."
  }) { success comment { id url } }
}
```

(Linear comments are Markdown; the GitHub `<sup>` wrapper is not
needed. Use bold + a session link.)

# Allowed Linear operations (allowlist)

```
query    issues(filter: ...)         # list-candidates
query    issueLabels(...)            # resolve label UUID
mutation issueLabelCreate(...)       # create label if missing
mutation issueAddLabel(...)          # apply-label
mutation issueRemoveLabel(...)       # swap-label (failure path)
mutation commentCreate(...)          # post-skip-comment, post-failure-comment
```

No `issueUpdate`, no assignee changes, no state transitions, no
project/cycle changes. PR linking happens automatically when the
worker mentions the identifier in the PR title/body.

# Anti-patterns

- Adding the label **after** launching the worker — defeats the
  dedup. Always label first, launch second.
- Adding the `cosmos-skipped` label **after** posting the skip-reason
  comment — same race. Always label first, comment second.
- `issueUpdate(input: { labelIds: [...] })` — replace-all clobbers
  reporter labels. Use `issueAddLabel`/`issueRemoveLabel`.
- Posting a comment on dispatch-path success.
- Constructing the Linear URL from the workspace name — workspace
  slugs drift; always use the `url` field from the API.
- Caching label UUIDs across teams — labels are team-scoped; cache
  per `(team_id, label_name)`.
