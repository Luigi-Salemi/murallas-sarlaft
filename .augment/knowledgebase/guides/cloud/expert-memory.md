# Expert Memory — Simple & Noisy Models

Standardized shape for any expert team that accumulates memory across sessions
(Code Review, Feedback Triager (Slack), Incident Response, Release Notes, and so
on). Other teams inherit one of two models below; each team's templates only
need to spell out **what** to write, not **where** or **how**.

## Choosing a model

**Default to simple memory.** Reach for noisy memory only when simple
demonstrably can't carry the team's signal. Today the only noisy-memory
team in production is Code Review; every other memory-using expert
should be on simple memory unless it grows the same shape of need.

| | Simple memory (default) | Noisy memory (only if needed) |
|---|---|---|
| Tiers | 1 file: `knowledge/{SCOPE}.md` | 2 files: `breadcrumbs/{SCOPE}.md` + `knowledge/{SCOPE}.md` |
| Writers | Only on high-quality signal (`Source: human-feedback`); append a one-line bullet under a team-defined `##` heading | Append a `## <title>` section with `Source / Paths / Date` metadata on any signal class |
| Curator | None — bullets are written ready-to-read | `curate-knowledge` rewrites `knowledge/` from breadcrumbs with source-weighted promotion (≥3) |
| Compaction | None on the write path; reader budget enforced separately | Probabilistic compaction lottery on breadcrumbs; `prune-and-compact` on knowledge |
| Annotations | None or team-defined (e.g. `(slack-permalink, YYYY-MM-DD)`) | Required `(seen N× — sources; last anchor; persistence)` |
| Veto | Same-session whole-line delete | Same-session section delete |
| Today's users | Feedback Triager (Slack) (and the default for new memory-using teams) | Code Review |

Rules of thumb:

- **Start with simple.** If every captured fact is authoritative on its
  own and is named/scoped by a human at write time (a standing rule, an
  explicit preference), simple memory is the right answer. Aggregation
  across sources adds nothing.
- **Switch to noisy only when** multiple weaker signals
  (`agent-inferred`, `human-comment`, `human-reaction`, `pr-outcome`)
  must accumulate before a pattern is worth surfacing — i.e. curation
  itself is the value the team is delivering. If you can't point at a
  concrete need for the breadcrumb tier, the curator, and the
  source-weighted promotion threshold, you don't need noisy memory.

Both models share the **reader** skill (`skills/memory/load-memory.md`)
and the **knowledge-file location** (`knowledge/{SCOPE}.md`). They differ
only in how that file gets populated.

## Layout

Every memory-using expert team owns a directory under `org/experts/`:

```
org/experts/<team>/
  breadcrumbs/                 ← noisy-memory teams only
    {SCOPE}.md                 ← per-scope notes (structured Markdown)
  knowledge/
    {SCOPE}.md                 ← per-scope file readers consume
  meta/                        ← optional; team-private bookkeeping
    ...
```

`{SCOPE}` is whatever scope key the team uses. Repo-bound teams (Code
Review, Deep Code Reviewer, …) shard by `{owner}/{repo}`, so files live in an
`{owner}/` subdirectory mirroring GitHub's native addressing — writers
create the owner directory on first write (`mkdir -p breadcrumbs/{owner}`
/ `knowledge/{owner}`). Single-scope teams (Advisor, Competitive
Intelligence, …) use a single scope key like `global` instead. Channel-
or thread-bound teams (Feedback Triager (Slack), …) shard on the integration's
native key (e.g. `channel_<CHANNEL_ID>`).

Simple-memory teams own only the `knowledge/` directory; the
`breadcrumbs/` directory is unused for them.

`<team>` values are chosen per-expert-team, e.g. `code-review`,
`feedback-triager`, `incident-response`. Keep the name short and
stable — it appears in every template path.

# Simple memory model

Single-tier. Writers append one bullet per fact directly to
`knowledge/{SCOPE}.md` under a team-defined `##` heading. There is no
curator, no breadcrumb tier, no source-weighted promotion, and no
`(seen N×)` annotation grammar — every bullet is already authoritative
because the only writer fires on `Source: human-feedback`.

The team's binding wrapper for `skills/memory/simple/capture.md`
supplies:

- The set of allowed `##` headings (action classes, topic names, or
  whatever matcher the readers will pivot on).
- The bullet shape, including any inline anchor format (e.g.
  `- <one-sentence rule>. (<slack-permalink>, YYYY-MM-DD)`).
- The veto rule (typically: whole-line delete the bullet on a
  same-session veto from the same teammate).

Readers use the same `skills/memory/load-memory.md` skill as noisy
memory: they read `knowledge/{SCOPE}.md`, walk its `##` headings, and
collect the bullets under each matching heading. Because the file is
written ready-to-read, no parsing of evidence scores or source
breakdowns is required.

## Example instantiation — `feedback-triager`

```
org/experts/feedback-triager/
  knowledge/
    channel_C0123456789.md     ← per-channel standing rules, one bullet each
```

```markdown
# Curated learnings — channel_C0123456789

## classification

- Thanks-only messages count as silence. (https://acme.slack.com/archives/C0123456789/p1717000000000123, 2026-04-16)

## routing

- UI bugs in this channel route to acme/web-app. (https://acme.slack.com/archives/C0123456789/p1717000111000456, 2026-05-02)
```

The standing-rule branch in the event loop is the only writer; each
matched non-bot reply appends one bullet. There is no curator and no
compaction step on the write path.

# Noisy memory model

Two-tier. Writers append `##`-delimited sections to
`breadcrumbs/{SCOPE}.md` on any signal class (`agent-inferred`,
`human-comment`, `human-reaction`, `pr-outcome`, or `human-feedback`).
A curator (typically inlined into a writer that just appended a
breadcrumb) reads breadcrumbs, applies source-weighted promotion
(threshold ≥ 3), and rewrites `knowledge/{SCOPE}.md` as a single
whole-file rewrite.

The rest of this guide describes the noisy model in detail.

## Breadcrumbs file format

Breadcrumb files are **structured Markdown**. Each breadcrumb is one
`##` section: a short title, a `Source:` bullet, a `Paths:` bullet, then
free-form prose.

```markdown
## Billing needs feature flags

- **Source:** human-feedback
- **Paths:** `services/billing/**`
- **Date:** 2026-04-16

Akshay pointed out in PR-12345 that billing changes should gate new
behavior behind a flag before merge.

## Eventual consistency is by design in auth

- **Source:** agent-inferred
- **Paths:** `services/auth/**`
- **Date:** 2026-04-18

Agent noticed dual-write pattern in auth during review of PR-12301;
this is by design (eventual consistency). Don't flag as a bug.

## Retry logic is acceptable in auth right now

- **Source:** human-reaction
- **Paths:** `services/auth/**`
- **Date:** 2026-04-18

👍 on Pair Reviewer's suggestion to add retries (PR-12301).
```

- **Title** (`##` heading) — short human tag. Used by the compactor to
  merge near-duplicates and by readers skimming the file.
- **Source** (first bullet, required) — one of, in descending weight:
  - `human-feedback` — explicit statement or endorsement by a human
    ("we gate billing behind a flag"), or an `agent-inferred` insight
    upgraded after explicit human endorsement. Highest weight.
  - `human-comment` — distilled from a human PR comment that cleared
    the noise filter (1+ reactions, substantive reply, or addressed
    change request).
  - `agent-inferred` — agent auto-captured the insight during or after
    a task; the human was notified via a brief heads-up but did not
    explicitly confirm or deny. Same weight as `human-reaction`.
  - `human-reaction` — any indication that an agent comment was
    addressed (👍, reply saying addressed, or the suggested change
    actually being made) with no further textual context. Low weight;
    many needed to matter.
  - `pr-outcome` — pattern inferred from merge/close outcome without
    explicit human text. Lowest weight.
- **Paths** (second bullet, required) — backticked list of glob
  patterns, or `(none)` for cross-cutting notes. Enables path-scoped
  grouping in knowledge and filtering by readers.
- **Date** (third bullet, optional) — ISO-8601 `YYYY-MM-DD` recording
  when the breadcrumb was written. Authoritative for curator age
  comparisons, since the curator runs offline and does not resolve PR
  numbers to merge/close dates. Writers should emit it; if omitted,
  the breadcrumb is undated and therefore not subject to age-based
  pruning.
- **Prose** (everything after the bullets) — free-form Markdown. Keep
  it concise and human-readable; include a PR anchor (e.g. `PR-12345`
  or a full PR URL) when one applies. A PR anchor in the prose wins
  over `Date:` as the **displayed** "last seen" marker in the curated
  knowledge annotation — readers see `last PR-12345` even when a
  `Date:` bullet is present — but age comparisons still use the
  `Date:` bullet. Do not nest structured fields that duplicate the
  bullets above.

Treat these files as append-only. The compactor is the only step that
rewrites a file in full — with one exception: the writing agent may
delete or amend a section it wrote in the **current session** if the
human vetoes or corrects it (see the feedback-capture skill for details).

## Knowledge file format

Knowledge files are **Markdown**. The team's curator rewrites them in
full on each curation pass. Readers load them directly into the model
context — no parsing required.

Per-repo knowledge (`knowledge/{owner}/{repo}.md`) is grouped by path
under `##` headings so readers and humans can scope to a directory in
one jump:

```markdown
# Curated learnings — augmentcode/augment

## services/billing/**

- Billing changes require a feature flag before merge. *(seen 8× — 3 human-feedback, 5 human-comment; last PR-12345; permanent)*
- Eventual consistency is the default — don't flag stale reads as bugs. *(seen 12× — 4 human-feedback, 8 human-comment; permanent)*

## services/auth/**

- Auth service is flaky right now; retry logic is OK to add. *(seen 3× — 3 human-reaction; last PR-12301; temporal — expires 2026-06)*

## (cross-cutting)

- Team prefers table-driven tests over many small `t.Run` calls. *(seen 5× — 2 human-feedback, 3 human-comment; permanent)*
```

Single-scope teams use the same per-scope shape with topic headings
instead of path globs (their insights aren't naturally path-scoped):

```markdown
# Curated learnings — global

## Conventions

- ...

## Cross-cutting risks

- ...
```

Each bullet SHOULD end with an italicized annotation in the form
`*(seen N× — <source breakdown>; last <anchor>; <persistence>)*` so
readers can gauge weight, source mix, and freshness at a glance. The
top-level fields are separated by `; ` (semicolon-space) so each field
parses unambiguously; within the source breakdown, individual counts
are comma-separated in descending weight order, e.g.
`2 human-feedback, 3 human-reaction`. Readers weight `human-feedback`
/ `human-comment` sources heavier than `human-reaction` / `pr-outcome`
when judging significance.

Knowledge files have a **50 KiB reader ceiling**. Readers load them
verbatim into agent context, so anything larger costs prompt budget
without proportional signal gain. Curators that cross the ceiling must
compact down to **≤ 20 KiB** in the same run (drop `<!-- pre_insight
-->` markers and `(decayed)` bullets first, then merge
near-duplicates, then raise the visibility threshold from evidence
score ≥ 3 to ≥ 5). High-signal bullets (score ≥ 10) are never dropped
to fit a budget — if the file still exceeds 50 KiB after those steps,
emit a budget warning instead.

## Default memory prompt

Copy this block into any expert template that writes to a breadcrumbs
file. The rules are intentionally short so they can be inlined verbatim.

```text
# Writing to a breadcrumbs file

1. Auto-capture: when the agent identifies an insight worth saving,
   append a new `## <title>` section to the target Markdown file with
   exactly this shape:

       ## <short title>

       - **Source:** <agent-inferred | human-feedback | human-comment | human-reaction | pr-outcome>
       - **Paths:** `<glob>`, `<glob>`   # or `(none)` for cross-cutting
       - **Date:** <today's date, ISO-8601 YYYY-MM-DD>   # optional but recommended

       <1–3 sentences of prose. Include a PR anchor (e.g. PR-12345 or
       the full PR URL) when one applies.>

   Never truncate or rewrite existing sections — append only
   (except same-session veto deletions).
2. In interactive sessions (Pair Reviewer, CLI, Slack, etc.), give the
   human a brief heads-up after writing:
       📝 Remembered: <title> — <one-sentence summary>
   Do NOT ask for confirmation. Silence = consent.
   In non-interactive contexts (e.g. Memory Manager post-merge),
   skip the heads-up — no one is watching.
3. If the human vetoes ("that's wrong", "don't save that"):
   delete the section. If the human corrects, replace with a
   corrected section using Source: human-feedback.
4. If the human endorses ("yes", "good", 👍): upgrade Source
   from agent-inferred to human-feedback in-place.
5. After appending, check the file's size on disk.
6. If size > 50 KiB: generate a random integer R in [0, 10] (inclusive).
   - If R == 0: COMPACT the file now (procedure below).
   - Otherwise: leave the file as-is.

# Compacting a breadcrumbs file

Goal: reduce the file to roughly 10 KiB while preserving information
value. The following invariants apply to all merging and summarization:
- **Source counts** — never discard a source or reduce a count; the
  curator computes evidence scores from these.
- **Latest date** — keep the newest `Date:` bullet so the curator can
  age-check the merged section.
- **Re-distillable prose** — keep at least one concrete sentence plus
  the most recent URL anchor; bare titles are not sufficient.
- **Drop priority** — drop older, lower-weight sections first:
  oldest `pr-outcome`/`agent-inferred`/`human-reaction` → oldest
  `human-comment` → oldest `human-feedback`. Higher-weight and newer
  sections are last to go.
- **Current-session freeze** — sections written in the current session
  are excluded from merging and summarization so the human can still
  veto or correct them.

1. Read all `## `-delimited sections from the file.
2. Freeze current-session sections — set them aside unchanged.
3. Merge the remaining sections with the same or near-duplicate title
   into a single section. The merged section:
   - Keeps the union of `Paths:`.
   - Preserves all source counts in descending weight order,
     e.g. `- **Source:** human-feedback ×2, agent-inferred ×3`.
   - Keeps the newest `Date:` bullet.
   - Keeps the most recent prose plus 1–2 earlier PR anchors.
4. If still above target, compress sections following the drop priority:
   oldest low-weight sections first, grouped by topic or `Paths:`.
5. Rewrite the file in full (frozen sections written back unchanged).
6. Stop once the total size is ≈ 10 KiB or there are no more sections
   to merge/compress, whichever comes first.
```

Knowledge files are **not** subject to the compaction rule. The team's
curator owns them and rewrites them in full on each curation pass.

## Rules

1. **Breadcrumbs are notes; knowledge is curated.** `breadcrumbs/` holds
   notes recorded by the team's own experts — raw observations,
   distilled PR summaries, auto-captured agent insights, and
   human-endorsed feedback. `knowledge/` holds the curated corpus that
   reader experts are expected to consume.
2. **Hand off through breadcrumbs, never knowledge.** When an expert
   wants another team to pick something up, it writes into that team's
   `breadcrumbs/`. It never writes into another team's `knowledge/`.
   Knowledge is the curator's output, not a handoff channel.
3. **Each team curates its own breadcrumbs into its own knowledge.**
   Curation may be done by a dedicated curator sub-expert, or inlined
   into the writer that just appended a breadcrumb (the pattern used by
   the Code Review Memory Manager, which rewrites the per-repo
   knowledge file at the end of every PR-close run). No other team
   writes to a team's `knowledge/`.

## Knowledge Curation

The curator rewrites `knowledge/*.md` in full on each run from the
current breadcrumb set. There is no cursor — running twice on the same
input produces the same output. The `seen N×` counts and source
breakdowns in knowledge are derived from the current state of
`breadcrumbs/`, not accumulated across curator runs.

This makes the breadcrumb compaction rule load-bearing: it folds
duplicate observations into per-source counts inside each section, so
`seen N×` stays meaningful without double-counting raw observations as
the corpus grows.

The shared `skills/memory/curate-knowledge.md` skill operates **per
scope only** — the calling expert reads its own
`breadcrumbs/{SCOPE}.md` and rewrites its own `knowledge/{SCOPE}.md`
as a single whole-file rewrite. The skill does not list or read other
scopes' breadcrumbs and does not write to other scopes' knowledge
files. Used by the Code Review Memory Manager at the end of every
PR-close run.

## Example instantiation — `code-review`

```
org/experts/code-review/
  breadcrumbs/
    augmentcode/
      augment.md               ← PR summaries + in-session human feedback
    acme/
      web-app.md
  knowledge/
    augmentcode/
      augment.md               ← per-repo curated Markdown (path-headed)
    acme/
      web-app.md
  meta/                        ← no cursors; may hold run diagnostics
```

- Pair Reviewer **auto-captures** `agent-inferred` sections
  to the relevant `breadcrumbs/{owner}/{repo}.md` with a brief heads-up.
  If the human endorses, the section is upgraded to `human-feedback`.
- Memory Manager appends one section per merged/closed PR to the same
  file, tagged with the strongest source present on the PR
  (`human-comment` when noise-filtered human comments exist,
  `human-reaction` when only reactions on agent comments exist,
  `pr-outcome` otherwise). It is idempotent: if a section's prose
  already contains the PR URL, the append is skipped.
- After appending, the same Memory Manager run rewrites
  `knowledge/{owner}/{repo}.md` from the current breadcrumb set using
  the shared `curate-knowledge` skill (single whole-file rewrite),
  then prunes-and-compacts the file in place via `prune-and-compact`.
  There is no scheduled curator and no cross-repo aggregation —
  per-repo reviewers (PR Risk Analyzer, Pair Reviewer)
  load the per-repo file directly.

## Wiring memory into a bespoke expert

When the Advisor's `build-expert` flow opts a new expert into memory,
use this recipe to construct the bundle. The Advisor reaches this
page on-demand (only when the user said yes during the design loop),
so the wiring detail does not need to live in the build-expert
skill itself.

- `{TEAM}` — the new expert's `metadata.name` (kebab-case-id) is a
  fine default.
- `{SCOPE}` — `global` for single-scope experts (default); use
  `{owner}/{repo}` only when the work is naturally sharded by repo
  and the expert can resolve owner/repo from each task.
- **Path scope** — the § Layout above shows the
  `org/experts/{TEAM}/...` layout, which is correct for
  `visibility: tenant`. For `visibility: user`, override to user
  scope by substituting `user/` for `org/` in every path the
  included skills reference.
- **Skills to wire** — only the read + write halves a live expert
  needs: `kb://skills/memory/load-memory.md` and
  `kb://skills/memory/feedback-capture.md`. Curator skills
  (`curate-knowledge.md`, `prune-and-compact.md`) belong in a
  separate PR-close-triggered companion expert (see knowledgebase
  `expert-templates/prompts/code-review-memory-manager.md`); do
  **not** wire them into a single bespoke expert unless the user
  explicitly asks for the curator role too.

Copy the system-prompt shape (heading, `TEAM`/`SCOPE` binding list,
the two literal `<include>` directives, plus the user-scope
override block when visibility is `user`) from knowledgebase
`expert-templates/prompts/personal-assistant.md` lines 57–73. Swap
its `tenant/` → `user/` wording for `org/` → `user/` to match the
path words the as-shipped memory skills actually use.

In the pre-`apply` summary the Advisor shows the user, mention
memory in one short bullet ("Learns from past sessions — per-user
/ per-team") so the user knows it's wired in, and flag the
heads-up behavior so the first `📝 Remembered: …` message isn't a
surprise.
