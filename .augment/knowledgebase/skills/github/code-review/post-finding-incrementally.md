---
name: github-code-review-post-finding-incrementally
description: For a very large code review where holding every finding in working memory is a risk, post each approved finding to GitHub the moment it is finalized (one at a time) instead of queuing it for a single batched review, then build the verdict from durable GitHub state.
---
# Posting findings incrementally for very large reviews

This is the **incremental** alternative to the default batched flow in
the queue-and-submit-review skill. Use it only when the calling expert
selects incremental mode for a very large review. Everything else —
anchoring rules, the Comment Header, the Verdict Header, and the
verdict format — is unchanged from that skill; only the timing of when
comments reach GitHub differs.

In incremental mode, each approved finding goes to GitHub the moment it
is finalized for posting, one at a time, instead of into the in-session
queue. Each finding is durably on GitHub as soon as it is approved, so
none is lost if the session's working memory of the pending set drifts
over a long review. Nothing is held back for a combined review — only
the verdict body is posted at the end.

## Posting a finding

As soon as a finding is finalized for posting, post it immediately as
one inline review comment:

```
POST /repos/{owner}/{repo}/pulls/{pr_number}/comments
{
  "body": "<Comment Header>\n\n<finding body>",
  "commit_id": "<PR head SHA>",
  "path": "src/foo.go",
  "line": 42,
  "side": "RIGHT"
}
```

For a multi-line range, also set `start_line` and `start_side` (same
`RIGHT`/`LEFT` rules as the anchoring section of the batched skill).
`commit_id` is the PR's current head SHA. Every finding lands inline,
including one that concerns code outside any diff hunk: anchor it to
the nearest changed line on the same side and explain the off-diff
relationship in the body, per the batched skill's anchoring rule.
Incremental mode does not use that skill's unanchored fallback —
keeping every comment inline keeps it PATCHable. Never silently drop a
finding.

Record each posted finding's returned comment `id`, severity, and
anchor in an in-session list so a later revision can reach it without
re-listing.

## Revising a posted finding

If discussion changes a conclusion — upgrading or downgrading severity,
or retracting a finding — edit it on GitHub. Every finding is anchored,
so PATCH it directly using the comment `id` you recorded when you posted
it (no re-listing needed):
`PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}` with the
updated body. The edited comment should include a note at the bottom,
for example:

> *Updated after discussion with @[github_username]: downgraded from
> BLOCKER to SUGGESTION — the validation is handled upstream.*

If the GitHub username is not known, use the user's email address from
session-metadata.md in place of @[github_username].

## Submitting the verdict

The inline comments are already on GitHub, so the verdict is submitted
as a review whose `body` is the verdict text (with the Verdict Header)
and whose `comments` array is empty:

```
POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews
{ "event": "APPROVE" | "REQUEST_CHANGES" | "COMMENT", "body": "<Verdict Header>\n\n<verdict text>", "comments": [] }
```

The verdict body still summarizes every finding (blockers, suggestions,
nits) even though each is already posted inline. Rebuild that summary
from durable GitHub state rather than in-session recall — incremental
mode exists precisely because a long session can lose its in-session
list: `GET /repos/{owner}/{repo}/pulls/{pr_number}/comments` lists every
posted finding.

For APPROVE verdicts, the calling expert's Approval Fallback applies:
every call in that fallback (both the bot attempt and the user attempt)
must use the full review payload above with an empty `comments` array.
