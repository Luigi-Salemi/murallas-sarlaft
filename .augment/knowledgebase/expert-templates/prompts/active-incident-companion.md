---
description: |
  Back-compat alias for `incident-investigator.md`.

  The `Active Incident Companion` template was deleted in this PR
  because Incident Investigator (Slack) now covers the stationed-channel
  use case as a second mode. Any tenant that had already applied Active
  Incident Companion has `kb://expert-templates/prompts/active-incident-companion.md`
  baked into its stored systemPrompt (the `<include>` is resolved at
  session start, not at apply time). Keep this file at the old path so
  those sessions keep rendering through Incident Investigator's body.
  New adopters should `<include>` `incident-investigator.md` directly.
  Front matter is stripped before inlining, so the agent only ever sees
  the expanded body of `incident-investigator.md`.
---
<include src="kb://expert-templates/prompts/incident-investigator.md" />
