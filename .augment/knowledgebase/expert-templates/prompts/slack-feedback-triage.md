---
description: |
  Back-compat alias for `feedback-triager.md`.

  Already-deployed `Slack Feedback Triage` experts have the URI
  `kb://expert-templates/prompts/slack-feedback-triage.md` baked into
  their stored systemPrompt (the `<include>` is resolved at session
  start, not at apply time). Keep this file at the old path so those
  sessions keep rendering. New adopters should `<include>`
  `feedback-triager.md` directly. Front matter is stripped before
  inlining, so the agent only ever sees the expanded body of
  `feedback-triager.md`.
---
<include src="kb://expert-templates/prompts/feedback-triager.md" />
