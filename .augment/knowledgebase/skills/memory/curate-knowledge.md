---
name: memory-curate-knowledge
description: Distill a team's structured-Markdown breadcrumbs into a curated Markdown knowledge file. Reads `breadcrumbs/{SCOPE}.md`, applies source-weighted promotion (threshold ≥ 3), groups bullets under per-scope headings, and rewrites `knowledge/{SCOPE}.md` as a single whole-file rewrite. The calling expert supplies the team name (`{TEAM}`) and scope (`{SCOPE}`) via its context block.
---
# Curate knowledge

Read the calling expert's own breadcrumb file and rewrite its curated knowledge file as a single whole-file rewrite. The team name (`{TEAM}`) and scope (`{SCOPE}`) are supplied by the calling expert's context block. Curation is **deterministic**: `knowledge/{SCOPE}.md` is a pure function of the current `breadcrumbs/{SCOPE}.md`. No cursor state.

The skill operates **per scope only**. It reads exactly one breadcrumb file (`breadcrumbs/{SCOPE}.md`) and writes exactly one knowledge file (`knowledge/{SCOPE}.md`). It does not list or read other scopes' breadcrumbs, and it does not write to any other scope's knowledge file.

## Step 1 — Read breadcrumbs

Read **only** `/root/.augment/vfs/AGENT_ID/org/experts/{TEAM}/breadcrumbs/{SCOPE}.md` (e.g. `breadcrumbs/{owner}/{repo}.md` for repo-bound teams). Do not list or read other scopes' breadcrumb files.

Parse the file as a sequence of `## `-delimited sections. Each section has:
- A title (the H2 heading text).
- A `- **Source:** <value>` bullet. After compaction this may be `human-feedback ×2, human-reaction ×5` — parse every listed source with its count.
- A `- **Paths:** <globs>` bullet. `(none)` means cross-cutting; otherwise a comma-separated list of glob patterns.
- An optional `- **Date:** YYYY-MM-DD` bullet — the section's "written on" date.
- Free-form prose (may include URLs, sub-headings, bullets).

If the breadcrumb file has no sections, skip distillation and proceed to pruning (handled by the calling expert).

## Step 2 — Distill into Markdown

1. Load `knowledge/{SCOPE}.md` (e.g. `knowledge/{owner}/{repo}.md`). If missing, start from an empty outline. For per-repo scopes, `mkdir -p knowledge/{owner}/` before writing.
2. For each breadcrumb section, distill a concise insight that would change future triage or behavior. Skip sections whose only sources are `pr-outcome` with no actionable signal. Sections with `agent-inferred` sources are valid candidates for distillation — they carry the same weight as `human-reaction` and `pr-outcome` (weight 1 each) and participate in evidence-score accumulation normally.
3. Merge the insight into the Markdown under the right heading. Group bullets under `##` matcher headings appropriate to the team (path-pattern globs like `## services/billing/**` for repo-bound work, or any other matcher the team uses). Use the `Paths:` value to choose the heading. For sections with `Paths: (none)` or empty paths, place the bullet under `## (cross-cutting)`.
4. **Source-weighted promotion threshold.** A bullet is promoted to visible knowledge when its **evidence score** (computed per the source-weights skill) reaches **3 or more**. A single `human-feedback` section is enough (including `agent-inferred` sections upgraded to `human-feedback` after human endorsement). Three `agent-inferred` / `human-reaction` / `pr-outcome` sections together are also enough. Two such sections alone (score 2) are not.
5. For each promoted bullet, append an italicized annotation in the form:
   `*(seen N× — <source breakdown>; last <anchor>; <persistence>)*`

   Top-level fields are separated by `; ` (semicolon-space); the source breakdown within is comma-separated.
   - `seen N×` — total number of supporting breadcrumb sections (count each merged instance once).
   - `<source breakdown>` — non-zero source counts in descending weight order, e.g. `2 human-feedback, 3 human-reaction`.
   - `last <anchor>` — the most recent supporting signal. Choose by this precedence: (a) the most recent stable URL anchor (PR URL, ticket URL, commit SHA) in the supporting prose, (b) the newest `Date:` bullet across supporting sections, (c) omit the `last …` field entirely if neither exists.
   - `<persistence>` — one of:
     - `permanent` — standing convention, codebase fact, or architectural decision.
     - `temporal — expires YYYY-MM` — situational observation; include an expiry 60 days out from the most recent supporting section.

   When in doubt, classify as `permanent`.
6. If a new insight matches an existing bullet (same or near-duplicate wording under the same heading), merge their supporting evidence and refresh the wording if the new signal expresses it better. Otherwise add a new bullet.
7. Sub-threshold signals (evidence score < 3) are NOT written as visible bullets. Keep a `<!-- pre_insight: … score=W, seen N× -->` HTML comment at the bottom of the relevant section so they accumulate across runs. Promote to a visible bullet once the score crosses 3.

Write the knowledge file as a **single whole-file rewrite** — one atomic write of the full new content (e.g. `save-file`, or write to a temporary path and rename), not a sequence of `str_replace` edits to the existing file. The calling expert owns the file exclusively, so rewriting is always safe; readers only need the current view.

<include src="kb://skills/memory/internal-vfs-conflict-handling.md" />
