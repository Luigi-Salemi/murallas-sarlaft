---
name: github-human-comment-noise-filter
description: Filter human PR comments down to those with meaningful team signal — keep only comments with 1+ reactions, substantive replies, or addressed change requests; drop LGTMs, process noise, and bot-generated traffic. Used by analyzers ranking human signal on a PR.
---
# Human comment noise filter

Apply this filter to every human (non-agent, non-bot) PR comment before recording it as signal. The goal is to retain only comments where the team itself indicated the comment was noteworthy.

**Keep a human comment if it meets at least one of:**

- **1+ reactions** (👍 or 👎) from other humans — indicates team agreement or disagreement.
- **1+ substantive replies** that agree or discuss the point — replies of pure form (`thanks`, `🚢`, an emoji) do not count.
- The comment is a **change request** or **blocking comment** that was subsequently addressed — indicates an important convention even when no engagement landed on the comment itself.

**Drop a human comment if it is any of:**

- A simple acknowledgment: `LGTM`, `looks good`, `thanks`, `🚢`, a lone emoji.
- Bot-generated: CI status, coverage reports, automated check summaries.
- Process-only: `please rebase`, `waiting for CI`, `force-push when ready`.
- Has zero reactions, zero replies, and is neither a change request nor a blocking comment — the team gave no signal that it was noteworthy.

When a comment is kept, also classify it for downstream consumers:

- **`change_request`** — reviewer asks for a specific code change.
- **`suggestion`** — reviewer proposes an alternative approach without blocking.
- **`convention`** — reviewer references a team convention or best practice.
- **`observation`** — reviewer points out something noteworthy but not actionable.
