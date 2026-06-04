---
name: memory-knowledge-file-shapes
description: Canonical Markdown shape for curated per-scope knowledge files. Bullets are grouped under `##` matcher headings (file-path globs for repo-bound teams, topic names for single-scope teams, or any other matcher the team's binding documents). Each bullet ends with an italicized annotation carrying weight, source mix, freshness anchor, and persistence. Single source of truth for both writers (curate pass) and readers (load-memory).
---
# Knowledge file shapes

Curated knowledge files under `/root/.augment/vfs/AGENT_ID/org/experts/{TEAM}/knowledge/{SCOPE}.md` are Markdown. Each visible bullet MUST end with an italicized annotation so readers can gauge weight, source mix, freshness, and persistence at a glance.

Bullets are grouped under `##` matcher headings — file-path globs for repo-bound teams (e.g. `## services/billing/**`), topic names for single-scope teams (e.g. `## Conventions`, `## Cross-cutting risks`), or any other matcher the team's binding documents. Sections with no path scope live under `## (cross-cutting)`.

```markdown
# Curated learnings — {SCOPE}

## services/billing/**

- Billing changes require a feature flag before merge. *(seen 8× — 3 human-feedback, 5 human-comment; last PR-12345; permanent)*
- Eventual consistency is the default — don't flag stale reads as bugs. *(seen 12× — 4 human-feedback, 8 human-comment; permanent)*

## services/auth/**

- Auth service is flaky right now; retry logic is OK to add. *(seen 3× — 3 human-reaction; last PR-12301; temporal — expires 2026-06)*

## (cross-cutting)

- Team prefers table-driven tests over many small `t.Run` calls. *(seen 5× — 2 human-feedback, 3 human-comment; permanent)*

<!-- pre_insight: "skip retries for idempotent GETs" score=2, seen 2×, last PR-12280 -->
```

## Annotation grammar

Each visible bullet ends with `*(seen N× — <source breakdown>; last <anchor>; <persistence>)*`. Top-level fields separated by `; ` (semicolon-space); the source breakdown comma-separated; the `last …` field omitted when no anchor exists.

- `seen N×` — total supporting breadcrumb sections (each merged instance counts once).
- `<source breakdown>` — non-zero source counts in descending weight order.
- `last <anchor>` — most recent stable URL anchor in supporting prose, or newest `Date:` bullet, or omitted.
- `<persistence>` — `permanent` or `temporal — expires YYYY-MM`. Decayed temporal bullets carry `(decayed)` before the closing `*)`.
