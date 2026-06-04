---
name: code-review-knowledge-file-shapes
description: Code-review-specific binding for the generic memory knowledge-file-shapes skill. Sets TEAM=code-review and fixes per-repo scopes to `{owner}/{repo}` with file-path-glob headings.
---
# Review knowledge file shapes

Bindings for the included generic knowledge-file-shapes skill:

- `{TEAM}` = `code-review`. Files live under `experts/code-review/knowledge/`.
- Per-repo files are `knowledge/{owner}/{repo}.md`; `##` headings are file-path globs matched against PR changed files (e.g. `## services/billing/**`). Cross-cutting bullets (sections with `Paths: (none)` in the breadcrumb) land under `## (cross-cutting)` in the per-repo file.

<include src="kb://skills/memory/knowledge-file-shapes.md" />
