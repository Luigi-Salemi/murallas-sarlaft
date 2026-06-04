---
description: |
  Back-compat alias for `mr-author.md`.

  Already-deployed `MR Author (GitLab)` experts have the URI
  `kb://expert-templates/prompts/mr-author-gitlab.md` baked into
  their stored systemPrompt (the `<include>` is resolved at session
  start, not at apply time). Keep this file at the old path so those
  sessions keep rendering. New adopters should `<include>`
  `mr-author.md` directly. Front matter is stripped before inlining,
  so the agent only ever sees the expanded body of `mr-author.md`.
---
<include src="kb://expert-templates/prompts/mr-author.md" />
