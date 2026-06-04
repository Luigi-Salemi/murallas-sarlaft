---
name: gitlab-scan-existing-comments
description: Scan an MR's existing comments and discussions before posting anything. Used to surface unresolved threads and to give a brief summary in interactive reviews.
---
# Existing comments from other reviewers or bots

Before forming or posting any feedback, scan the MR's full conversation surface using the generic fetch skill below.

<include src="kb://skills/gitlab/fetch-mr-comments.md" mode="lazy" />

Use the result to:

- **Summarize the existing thread briefly** (who commented, what the theme was) when running an interactive review, so the human engineer or the MR author has context.
- **Flag unresolved threads** so the author can address them alongside your findings. In GitLab, unresolved discussions can be identified by the `resolved` field being `false`.
