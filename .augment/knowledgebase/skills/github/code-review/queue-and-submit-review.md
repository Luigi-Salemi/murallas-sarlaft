---
name: github-code-review-queue-and-submit-review
description: Queue inline review comments during a code review and submit them all together as one GitHub pull-request review when the verdict is posted. Covers anchoring findings to diff lines, the in-session queue, revising queued findings (locally and via PATCH after submission), and the GitHub Reviews API payload that combines the verdict body with the queued comments.
---
# Queue and submit one inline review

Code-review experts that post their verdict to GitHub collect approved
findings into an in-session queue and, by default, submit them all
together as inline comments on a **single** GitHub review when the
verdict is posted. This gives the PR author one coherent review,
anchored to the diff lines the comments refer to, instead of a stream
of free-floating PR comments.

## Posting mode

This skill covers the default **batched** flow: hold every approved
finding in the in-session queue and post nothing to GitHub until the
verdict is ready, then submit one review combining the verdict body
with all queued inline comments. For a very large review, the calling
expert may instead select an **incremental** mode that posts each
finding the moment it is approved, covered by the skill below:

<include src="kb://skills/github/code-review/post-finding-incrementally.md" mode="lazy" />

The anchoring rules below apply to both modes.

## Anchoring findings to diff lines

Every queued comment must point at a line GitHub will accept on the
review API. The rules:

- The line must be inside a hunk in the PR diff (a line that appears
  in the unified diff against the PR's destination branch).
- For added or modified lines, use `side: RIGHT` and the line number
  in the new file (the post-change line number).
- For deleted lines, use `side: LEFT` and the line number in the
  base file.
- For multi-line comments, set `start_line` to the first line of the
  range and `line` to the last line, and set both `start_side` and
  `side` to the same value (`RIGHT` or `LEFT`). GitHub rejects
  multi-line comments that omit `start_side`.
- If a finding genuinely concerns code outside any diff hunk
  (e.g., an invariant in unchanged code), prefer the nearest changed
  line in the same file/region and explain the relationship in the
  comment body. If there is no reasonable nearby anchor, mark the
  finding as `unanchored` in the queue — it will be rendered in the
  verdict body rather than as an inline comment when the review is
  submitted.

## Collecting comments for the review

Once a finding has been finalized for posting (per the calling
expert's flow — for an interactive expert that means after the human
engineer has approved it), add it to an in-session queue of pending
review comments. Nothing is sent to GitHub yet.

Maintain the queue as a list, where each entry has `path`, `line`
(or `start_line` + `line` for ranges), `side`, severity, and `body`.
Track it explicitly during the session so you can show its current
state when asked and so it survives between phases.

If you are already aware that a comment covering this finding exists
on the PR, do not add it to the queue.

## Revising a queued finding

Before the review is submitted to GitHub, revisions are local: update
the queued entry in place — change the severity, edit the body, or
remove it entirely. No GitHub roundtrip is needed because nothing has
been posted yet.

After the review has been submitted to GitHub, if discussion leads to
a change in conclusion — upgrading or downgrading severity, or
retracting a finding — offer to edit the corresponding inline review
comment on GitHub. The `POST .../reviews` response is a review
object and does not contain the per-comment ids, so fetch them with
`GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews/{review_id}/comments`
(matching by `path` + `line` + `side` against the queued entry),
then `PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}` with
the updated body. Record each queued entry's resolved comment id
once fetched so later edits don't have to re-list. The edited comment
should include a note at the bottom, for example:

> *Updated after discussion with @[github_username]: downgraded from BLOCKER
> to SUGGESTION — the validation is handled upstream.*

If the GitHub username is not known, use the user's email address
from session-metadata.md in place of @[github_username].

## Submitting the review

The review is submitted as **one** GitHub review that combines the
verdict body with all queued inline comments. Use the GitHub Reviews
API:

```
POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews
{
  "event": "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  "body": "<Verdict Header>\n\n<verdict text>",
  "comments": [
    {
      "path": "src/foo.go",
      "line": 42,
      "side": "RIGHT",
      "body": "<Comment Header>\n\n<finding body>"
    },
    {
      "path": "src/bar.py",
      "start_line": 10,
      "line": 14,
      "start_side": "RIGHT",
      "side": "RIGHT",
      "body": "<Comment Header>\n\n<finding body>"
    }
  ]
}
```

Rules:
- `event` matches the verdict the calling expert produced (APPROVE,
  REQUEST_CHANGES, or COMMENT).
- `body` is the verdict text with the Verdict Header prepended.
- Each entry in `comments` corresponds to one queued finding. Each
  comment body starts with the Comment Header.
- Use `side: RIGHT` with the new-file line number for added or
  modified lines; use `side: LEFT` with the base-file line number
  for deleted lines. For multi-line ranges, set `start_line` and
  `line`, and set both `start_side` and `side` to the same value
  — GitHub rejects multi-line comments that omit `start_side`.
- Findings marked as `unanchored` (no usable diff line) are not put
  in `comments`. Append them to the review `body` under a "Findings
  without an inline anchor" heading so they are still delivered with
  the review. Never silently drop a finding.

If GitHub rejects the review (e.g., a line is outside the diff), fix
the offending entry — most often by adjusting `line` to the nearest
changed line on the same side — and retry. Do not split the review
into multiple reviews and do not fall back to free-floating PR
comments to work around an anchoring failure.

For APPROVE verdicts, the calling expert's Approval Fallback applies.
The Approval Fallback shared skill describes a payload of
`{event, body}`; when combined with this skill, every call in that
fallback (both the bot attempt and the user attempt) must use the
full payload above — including the queued `comments` array.
