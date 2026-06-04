---
name: github-inline-comment-anchoring
description: Anchor inline review comments to lines that actually appear in the PR patch, not lines that only exist in the local checkout. Includes guidance for findings about unchanged code (anchor to the changed line that causes the issue) and the per-`side` rules for which hunk lines are valid anchors.
---
# Inline comment anchoring (required before submission)

Inline comments are positioned by the GitHub API against the PR's diff hunks, not against your local working copy. A local source line that "looks right" is **not sufficient**.

Before submitting an inline comment, verify its anchor as follows:

1. **Confirm the anchor exists in the PR patch.** For each `(path, side, line)`, the line must appear in a hunk of the PR diff:
   - `side: "RIGHT"` → an added (`+`) or context (` `) line on the new side.
   - `side: "LEFT"` → a removed (`-`) or context (` `) line on the old side.
2. **Findings about unchanged code:** if the issue is logically about a line the PR did not touch, anchor the comment to the changed line that *causes* the unchanged line to be wrong (e.g. the new caller, the renamed symbol, the modified signature, the added branch) and reference the unchanged location in the comment body. If no such changed line exists, drop the finding.
