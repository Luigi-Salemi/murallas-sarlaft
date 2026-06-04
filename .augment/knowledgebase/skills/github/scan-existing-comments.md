---
name: github-scan-existing-comments
description: Scan a PR's existing top-level comments, review comments, and reviews before posting anything. Used to surface unresolved threads and to give a brief summary in interactive reviews.
---
# Existing comments from other reviewers or bots

Before forming or posting any feedback, scan the PR's full conversation surface using the generic fetch skill below.

<include src="kb://skills/github/fetch-pr-comments.md" mode="lazy" />

Use the result to:

- **Summarize the existing thread briefly** (who commented, what the theme was) when running an interactive review, so the human engineer or the PR author has context.
- **Flag unresolved threads** so the author can address them alongside your findings.
