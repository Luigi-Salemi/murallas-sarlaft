---
name: memory-load-memory
description: Load curated team memory at the start of a task — per-scope learnings rooted in the calling team's organization VFS. The calling expert supplies the team name and the scope key via its context.
---
# Load Memory

Before starting work, load relevant memories from the calling team's shared knowledge. The team name (`{TEAM}`) and the scope key (`{SCOPE}`, typically `{owner}/{repo}` for repo-bound work, or the team's single-scope key like `global` for teams that don't shard) are supplied by the calling expert's context block.

Read the per-scope knowledge file at
`/root/.augment/vfs/AGENT_ID/org/experts/{TEAM}/knowledge/{SCOPE}.md`.
- The file is Markdown, grouped under `##` headings by a matcher pattern. The matcher is team-specific — file-path globs for repo-bound teams (e.g. `## services/billing/**`), topic names for single-scope teams (e.g. `## Conventions`), or any other matcher the team's binding documents.
- For each heading, check whether the current task matches the pattern; if so, collect the bullets under that heading.
- Always also read the `## (cross-cutting)` section if present.

If the file does not exist or is empty, proceed without learnings.

Use matching learnings in two ways:

1. **Suppress false positives.** If a learning says a pattern is by-design (e.g. "this service uses eventual consistency by design"), do not flag that pattern as an issue or treat it as a problem to fix.
2. **Detect known anti-patterns.** If a learning warns against a specific practice (e.g. "Avoid logging both a metrics object and its individual fields in the same log line") and you see that practice in the current task, surface it. Reference the learning to explain why the pattern is problematic.

Cite learnings with confidence:
> *Memory (confidence 0.9, PRs #50377, #50890): [insight]*

For decayed learnings: *Memory (decayed, last reinforced 2026-01-15): [insight]*

If a learning contradicts what you observe, note the discrepancy to the human (or in the task output) rather than silently ignoring either signal.
