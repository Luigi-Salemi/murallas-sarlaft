---
description: |
  Back-compat alias for `mr-author-status-watcher-gitlab.md`.

  Already-deployed GitLab MR status-poll worker experts have the URI
  `kb://expert-templates/prompts/mr-status-poll-worker-gitlab.md`
  baked into their stored systemPrompt (the `<include>` is resolved
  at session start, not at apply time). Keep this file at the old
  path so those sessions keep rendering. New adopters should
  `<include>` `mr-author-status-watcher-gitlab.md` directly. Front
  matter is stripped before inlining, so the agent only ever sees
  the expanded body of `mr-author-status-watcher-gitlab.md`.
---
<include src="kb://expert-templates/prompts/mr-author-status-watcher-gitlab.md" />
