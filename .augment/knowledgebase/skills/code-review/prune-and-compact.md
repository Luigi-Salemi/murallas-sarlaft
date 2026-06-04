---
name: code-review-prune-and-compact
description: Code-review-specific binding for the generic memory prune-and-compact skill. Sets TEAM=code-review and SCOPE={owner}/{repo}, and inherits the standard 60/150/30-day persistence windows and 50 KiB / 20 KiB size budget.
---
# Prune and compact review knowledge

Bindings for the included generic prune-and-compact skill:

- `{TEAM}` = `code-review`. Files live under `experts/code-review/knowledge/`.
- `{SCOPE}` = `{owner}/{repo}` resolved from the PR being processed. The skill operates on `knowledge/{owner}/{repo}.md` only — it does not list or modify other repos' knowledge files.
- Persistence windows and size thresholds are the standard ones from the generic skill: `temporal` decays at 60 days and deletes at 150 days; `pre_insight` markers expire at 30 days; the reader ceiling is 50 KiB with a ≤ 20 KiB compaction target.

<include src="kb://skills/memory/prune-and-compact.md" />
