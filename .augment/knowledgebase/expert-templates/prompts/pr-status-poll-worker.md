---
description: |
  Back-compat alias for `pr-author-status-watcher.md`.

  Already-deployed `PR Author – Status Poll Worker` experts have the
  URI `kb://expert-templates/prompts/pr-status-poll-worker.md` baked
  into their stored systemPrompt (the `<include>` is resolved at
  session start, not at apply time). Keep this file at the old path
  so those sessions keep rendering. New adopters should `<include>`
  `pr-author-status-watcher.md` directly. Front matter is stripped
  before inlining, so the agent only ever sees the expanded body of
  `pr-author-status-watcher.md`.
---
<include src="kb://expert-templates/prompts/pr-author-status-watcher.md" />
