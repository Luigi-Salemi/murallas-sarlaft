---
description: |
  Back-compat alias for `incident-investigator.md`.

  Already-deployed `Slack Alert Investigator` experts have the URI
  `kb://expert-templates/prompts/slack-alert-investigator.md` baked
  into their stored systemPrompt (the `<include>` is resolved at
  session start, not at apply time). Keep this file at the old path
  so those sessions keep rendering. New adopters should `<include>`
  `incident-investigator.md` directly. Front matter is stripped
  before inlining, so the agent only ever sees the expanded body of
  `incident-investigator.md`.
---
<include src="kb://expert-templates/prompts/incident-investigator.md" />
