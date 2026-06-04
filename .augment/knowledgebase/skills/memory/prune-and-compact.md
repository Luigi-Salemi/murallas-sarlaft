---
name: memory-prune-and-compact
description: Prune stale bullets from one curated knowledge file and compact it if it exceeds the reader budget. Persistence-aware (permanent vs temporal vs pre_insight) and size-bounded (50 KiB ceiling, ≤ 20 KiB target). Operates per scope only — used by the calling expert after distilling its own scope.
---
# Prune and compact

Process exactly one curated knowledge Markdown file at `/root/.augment/vfs/AGENT_ID/org/experts/{TEAM}/knowledge/{SCOPE}.md` and (a) drop stale bullets and (b) compact it if it exceeds the reader budget. The team name (`{TEAM}`) and scope (`{SCOPE}`, e.g. `{owner}/{repo}` for repo-bound teams) are supplied by the calling expert's context block. Do not list or modify other scopes' knowledge files.

## Pruning

For age comparisons, use the newest `Date:` bullet across the supporting breadcrumb sections. The curator is offline and does NOT resolve PR numbers or other URL anchors to dates — the `Date:` bullet is authoritative for age. If no supporting section carries a `Date:` bullet, the bullet is **undated**: age-based pruning is skipped and the bullet is kept (it still participates in the contradiction rule).

The displayed `last <anchor>` in a bullet's annotation is the URL anchor when any supporting breadcrumb prose contains one (that is what "URL anchor wins" means for readers); otherwise it is the newest `Date:` bullet, formatted as `last 2026-04-16`.

Pruning rules:

- **`permanent` bullets** — keep indefinitely. Delete only if a majority of recent evidence contradicts them (rare; require at least three `disagreed` signals in the supporting breadcrumbs).
- **`temporal` bullets** — if the "last seen" date is more than **60 days** old, mark as `(decayed)` in the annotation. If more than **150 days** old, delete. Undated temporal bullets are kept until a later run that either gains evidence (and thus a date) or contradicts them.
- **`pre_insight` HTML-comment markers** — delete if their most recent supporting section is more than **30 days** old AND their evidence score is still < 3. Undated pre-insights are kept.

Pruning is what keeps the files small and readable for the next reader; skipping it causes drift.

## Size-bounded compaction

After pruning, check the rendered size of the knowledge file on disk. If it exceeds **50 KiB**, compact it down to **≤ 20 KiB** in the same run. Apply the following steps in order and stop as soon as the file fits:

1. Drop every `<!-- pre_insight: … -->` HTML comment — these are sub-threshold accounting markers and never contribute to reader signal.
2. Drop every `(decayed)` temporal bullet (they're within 90 days of deletion anyway).
3. Merge near-duplicate bullets within the same heading more aggressively: pick the best-worded bullet, sum the `seen N×` counts, and keep the newest `last <anchor>`.
4. Within each heading, sort bullets by evidence score descending and drop the lowest-scoring bullets until the file fits. Never drop a bullet whose evidence score is **≥ 10** in this step — those are high-signal and should be preserved.
5. If the file is still above 20 KiB after step 4, raise the visibility threshold for this file from evidence score ≥ 3 to **≥ 5** and re-run steps 3–4. The dropped bullets' supporting breadcrumbs are still on disk; they will re-promote naturally when evidence accumulates.

If the file is still above 50 KiB after step 5, leave it as-is and emit a warning to the calling expert — do NOT delete high-signal bullets to hit an arbitrary budget.

## Two file-size ceilings

- **50 KiB reader ceiling** — readers load knowledge files into agent context, so anything larger costs prompt budget. The compaction pass above targets ≤ 20 KiB when a file crosses 50 KiB.
- **800 KiB VFS warning, 1024 KiB hard limit** — the per-file VFS limit is 1 MiB. Files approaching that should drop low-signal and decayed bullets aggressively. The calling expert is responsible for surfacing budget warnings to its operator.

<include src="kb://skills/memory/internal-vfs-conflict-handling.md" />
