---
name: gitlab-code-review-queue-and-submit-review
description: Queue inline review comments during a code review and submit them as GitLab MR discussion notes when the verdict is posted. Covers anchoring findings to diff lines, the in-session queue, and posting via glab CLI.
---
# Queue and submit inline review comments

Code-review experts that post their verdict to GitLab should not post
findings one comment at a time. Instead, collect approved findings into
an in-session queue and submit them together when the verdict is posted.

## Anchoring findings to diff lines

Every queued comment must point at a line in the MR diff. The rules:

- The line must be inside a hunk in the MR diff (a line that appears
  in the unified diff against the MR's target branch).
- For added or modified lines, use `new_line` (with `old_line` null).
- For deleted lines, use `old_line` (with `new_line` null).
- For context (unchanged) lines, set both `old_line` and `new_line`.
- If a finding genuinely concerns code outside any diff hunk, prefer
  the nearest changed line in the same file/region and explain the
  relationship in the comment body. If there is no reasonable nearby
  anchor, mark the finding as `unanchored` — it will be rendered in
  the verdict body rather than as an inline comment.

## Collecting comments for the review

Once a finding has been finalized for posting, add it to an in-session
queue of pending review comments. Nothing is sent to GitLab yet.

Maintain the queue as a list, where each entry has `path`, `new_line`
and/or `old_line`, severity, and `body`. Track it explicitly during
the session so you can show its current state when asked.

## Revising a queued finding

Before comments are submitted to GitLab, revisions are local: update
the queued entry in place — change the severity, edit the body, or
remove it entirely.

After comments have been submitted to GitLab, if discussion leads to
a change in conclusion, edit the posted note:

```bash
glab api --method PUT \
  "projects/:fullpath/merge_requests/<mr_iid>/notes/<note_id>" \
  -f body="<updated body>"
```

The edited comment should include a note at the bottom, for example:

> *Updated after discussion with @[username]: downgraded from BLOCKER
> to SUGGESTION — the validation is handled upstream.*

## Submitting the review

Post each queued finding as an inline discussion on the MR diff:

```bash
glab api --method POST \
  "projects/:fullpath/merge_requests/<mr_iid>/discussions" \
  -f body="<Comment Header>

<finding body>" \
  -f "position[position_type]=text" \
  -f "position[base_sha]=<base_sha>" \
  -f "position[head_sha]=<head_sha>" \
  -f "position[start_sha]=<start_sha>" \
  -f "position[new_path]=<file_path>" \
  -f "position[old_path]=<file_path>" \
  -f "position[new_line]=<line_number>"
```

For deleted lines, use `position[old_line]` instead of `position[new_line]`.

Get `base_sha`, `head_sha`, and `start_sha` from the MR diff versions:

```bash
glab api "projects/:fullpath/merge_requests/<mr_iid>/versions" --output json
```

Use the latest version's `base_commit_sha`, `head_commit_sha`, and
`start_commit_sha`.

After posting all inline comments, post the verdict as a top-level
MR note:

```bash
glab mr note <mr_number> --message "<Verdict Header>

<verdict text>

## Inline findings

<count> inline comments posted on the diff above."
```

Findings marked as `unanchored` are appended to the verdict note body
under a "Findings without an inline anchor" heading. Never silently
drop a finding.
