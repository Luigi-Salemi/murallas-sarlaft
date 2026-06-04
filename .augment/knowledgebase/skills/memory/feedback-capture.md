---
name: memory-feedback-capture
description: Auto-capture agent-inferred insights to the calling team's per-scope breadcrumb file in the team's organization VFS, with a brief heads-up to the human and opt-out veto. Includes the standard probabilistic compaction rule (size over 50 KiB, R == 0 of 11). The calling expert supplies the team name and the scope key via its context.
---
# Feedback capture

During and after a task, the agent **automatically identifies and writes** insights that will help future sessions — no explicit prompt or confirmation from the human is required. Apply this filter: **would this insight change a future decision or focus for tasks touching the same area?** If not, do not capture it.

Good candidates:
- Non-obvious invariants or design constraints
- Risk recalibrations ("this service's data is eventually consistent by design — don't flag dual-write patterns as bugs")
- Deployment or rollout context
- Patterns the agent initially misread
- Corrections the human made during the session

Bad candidates:
- General observations that don't change future behavior
- Things the human would already know from working in this codebase
- Style or convention notes that belong in `AGENTS.md`, not learning memory

# Writing breadcrumbs

When the agent identifies insights worth saving, it appends each as a `##`-delimited Markdown section to the calling team's per-scope breadcrumbs file **immediately** — without waiting for human confirmation. The team name (`{TEAM}`) and scope key (`{SCOPE}`, typically `{owner}/{repo}` for repo-bound work) are supplied by the calling expert's context block.

```
/root/.augment/vfs/AGENT_ID/org/experts/{TEAM}/breadcrumbs/{SCOPE}.md
```

Each learning becomes one `##`-delimited section with this shape:

```markdown
## <short title — e.g. Billing needs feature flags>

- **Source:** agent-inferred
- **Paths:** `<glob pattern matching the relevant files, e.g. services/billing/**>`
- **Date:** <today's date in UTC, ISO-8601 YYYY-MM-DD>

<one- or two-sentence insight in plain prose, with an anchor when available
(e.g. PR URL, ticket URL, or commit SHA)>
```

Rules for writing breadcrumbs:
- Resolve `{SCOPE}` from the calling expert's context. For GitHub-repo-bound work, this is `{owner}/{repo}` (e.g. `acme/web-app`); the `.md` suffix is appended by the path template above.
- Ensure the parent directory exists: `mkdir -p /root/.augment/vfs/AGENT_ID/org/experts/{TEAM}/breadcrumbs/<parent-of-scope>/`
- Append only — never truncate or rewrite existing sections (except for same-session veto deletions; see below).
- `Source:` is `agent-inferred` for auto-captured insights. If the human explicitly endorses an insight after seeing the heads-up (e.g. "yes, good", "that's right", 👍), **upgrade** the section's `Source:` to `human-feedback` in-place.
- Use the most specific path pattern that captures the learning. Prefer `services/billing/**` over `**`. For cross-cutting feedback that isn't tied to a directory, use `(none)`.
- `Date:` is today's UTC date in `YYYY-MM-DD` form. It gives the Curator a reliable age source when pruning; a stable URL anchor in the prose (if present) still wins as the "last seen" marker.

# Heads-up

The heads-up is only meaningful when a human is actively watching — i.e. in **interactive sessions** (Pair Reviewer, CLI/Cosmos sessions, Slack threads). In non-interactive contexts (e.g. the Deep Code Reviewer or the Memory Manager running post-merge), skip the heads-up entirely; no one is watching, and the breadcrumb still accumulates evidence for the curator.

In interactive sessions, after writing breadcrumbs give the human a **brief, non-blocking heads-up** so they can disagree. Keep it compact — one line per insight:

```
📝 Remembered: <short title> — <one-sentence summary>
```

If multiple insights were captured in one batch, use a bulleted list:

```
📝 Remembered:
  • <title 1> — <summary 1>
  • <title 2> — <summary 2>
```

Do NOT ask for confirmation. Silence from the human means consent.

<include src="kb://skills/memory/internal-vfs-conflict-handling.md" />

# Veto and correction

If the human disagrees with a captured insight ("that's wrong", "don't save that", "actually it's X"):

1. **Veto (delete):** Remove the breadcrumb section from the file entirely. This is the only case where a non-compactor may delete a section, and it is scoped to sections written in the **current session** only.
2. **Correction (amend):** If the human provides a corrected version, delete the original section and append a new one with the corrected prose and `Source: human-feedback` (since the human explicitly provided the insight).
3. Acknowledge briefly: `Got it — removed.` or `Updated — saved the corrected version.`

If the human explicitly endorses an auto-captured insight (without correcting it), upgrade `Source:` from `agent-inferred` to `human-feedback` in the existing section. Acknowledge: `Upgraded to confirmed insight.`

# Compaction

After appending, apply the standard breadcrumb compaction rule:

1. Check the file's size on disk.
2. If size > 50 KiB: generate a random integer R in [0, 10] (inclusive).
   - If R == 0: COMPACT the file now.
   - Otherwise: leave the file as-is.

## Compaction invariants

During both merging and summarization, the following MUST be preserved:

1. **Source counts.** Every merged section must carry the full multi-source header (`- **Source:** human-feedback ×2, agent-inferred ×3`). Never discard a source or reduce a count — the curator computes evidence scores from these.
2. **Latest date.** Keep the newest `Date:` bullet from the input sections. The curator uses it for age-based pruning; without it the section becomes undated and un-pruneable.
3. **Re-distillable prose.** The surviving prose must be specific enough for a future curator to derive the same actionable insight. One-word summaries or bare titles are not sufficient. Keep at least one concrete sentence plus the most recent URL anchor.
4. **Drop priority.** When the file must shrink, prefer dropping older sections over newer ones, and lower-weight sections before higher-weight ones. Priority order for what to drop first: oldest `pr-outcome` / `agent-inferred` / `human-reaction` → oldest `human-comment` → oldest `human-feedback`. Higher-weight and newer sections are last to go.
5. **Current-session freeze.** Sections written in the current session are excluded from merging and summarization entirely, so the human retains the ability to veto, correct, or endorse them.

## Compaction procedure (target ≈ 10 KiB)

1. Read all `## `-delimited sections from the file.
2. **Freeze current-session sections.** Set aside any section the agent appended in this session — it is not eligible for merging or summarization (invariant 5).
3. Merge the remaining sections with the same or near-duplicate title into a single section. The merged section keeps the union of `Paths:`, preserves all source counts (invariant 1), retains the newest `Date:` bullet (invariant 2), and keeps the most recent prose plus 1–2 earlier anchors (invariant 3).
4. If the file is still above target, summarize sections following the drop priority (invariant 4): compress oldest low-weight sections first into condensed sections grouped by topic or `Paths:`.
5. Rewrite the file in full with the compacted Markdown (frozen current-session sections are written back unchanged).
6. Stop once the total size is ≈ 10 KiB or there are no more sections to merge/compress, whichever comes first.
