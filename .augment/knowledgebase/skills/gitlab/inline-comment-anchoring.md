---
name: gitlab-inline-comment-anchoring
description: Anchor inline review comments to lines that actually appear in the MR diff, not lines that only exist in the local checkout. Includes guidance for findings about unchanged code and the old_line/new_line rules for diff positioning.
---
# Inline comment anchoring (required before submission)

Inline comments are positioned against the MR's diff hunks, not against your local working copy. A local source line that "looks right" is **not sufficient**.

Before submitting an inline comment, verify its anchor as follows:

1. **Confirm the anchor exists in the MR diff.** For each `(path, old_line, new_line)`:
   - `new_line` (with `old_line` null) → an added (`+`) line on the new side.
   - `old_line` (with `new_line` null) → a removed (`-`) line on the old side.
   - Both `old_line` and `new_line` set → a context (unchanged) line present in both sides.
2. **Findings about unchanged code:** if the issue is logically about a line the MR did not touch, anchor the comment to the changed line that *causes* the unchanged line to be wrong (e.g. the new caller, the renamed symbol, the modified signature, the added branch) and reference the unchanged location in the comment body. If no such changed line exists, drop the finding.
