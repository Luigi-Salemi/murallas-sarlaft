---
description: |
  Back-compat alias for `pair-reviewer.md`.

  The `Own Code Reviewer (GitHub)` template was deleted in this PR
  because Pair Reviewer covers the same self-review use case (see PR
  description "Deletion" section). Any tenant that had already
  applied Own Code Reviewer has `kb://expert-templates/prompts/own-reviewer.md`
  baked into its stored systemPrompt (the `<include>` is resolved
  at session start, not at apply time). Keep this file at the old
  path so those sessions keep rendering through Pair Reviewer's body.
  Front matter is stripped before inlining, so the agent only ever
  sees the expanded body of `pair-reviewer.md`.
---
<include src="kb://expert-templates/prompts/pair-reviewer.md" />
