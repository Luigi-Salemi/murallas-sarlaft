---
description: |
  Back-compat alias for `pair-reviewer.md`.

  Already-deployed `Intent Reviewer (GitHub)` experts have the URI
  `kb://expert-templates/prompts/intent-reviewer.md` baked into their
  stored systemPrompt (the `<include>` is resolved at session start,
  not at apply time). Keep this file at the old path so those sessions
  keep rendering. New adopters should `<include>` `pair-reviewer.md`
  directly. Front matter is stripped before inlining, so the agent
  only ever sees the expanded body of `pair-reviewer.md`.
---
<include src="kb://expert-templates/prompts/pair-reviewer.md" />
