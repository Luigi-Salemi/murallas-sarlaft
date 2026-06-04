---
description: |
  Back-compat alias for `backlog-dispatcher.md`.

  Already-deployed `Ticket Dispatcher` experts have the URI
  `kb://expert-templates/prompts/ticket-dispatcher.md` baked into
  their stored systemPrompt (the `<include>` is resolved at session
  start, not at apply time). Keep this file at the old path so those
  sessions keep rendering. New adopters should `<include>`
  `backlog-dispatcher.md` directly. Front matter is stripped before
  inlining, so the agent only ever sees the expanded body of
  `backlog-dispatcher.md`.
---
<include src="kb://expert-templates/prompts/backlog-dispatcher.md" />
