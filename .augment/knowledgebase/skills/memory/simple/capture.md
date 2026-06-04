---
name: memory-simple-capture
description: "Simple-memory writer — append one bullet per high-quality fact (`Source: human-feedback`) to the calling team's per-scope knowledge file (`knowledge/{SCOPE}.md`). No breadcrumb tier, no curator, no source-weighted promotion, no compaction lottery. The team's binding wrapper supplies the allowed `##` headings and the bullet shape. The calling expert supplies the team name and scope key via its context."
---
# Simple-memory capture

Single-tier writer. Every captured fact is authoritative on its own, so there is no breadcrumb tier and no curator.

The team name (`{TEAM}`) and the scope key (`{SCOPE}`) are supplied by the calling expert's context block via a thin binding wrapper. The wrapper also supplies the team-specific `##` heading set and the team-specific bullet shape — this skill defines only the mechanics that are shared across simple-memory teams.

# Where to write

Append straight to the calling team's per-scope knowledge file:

```
/root/.augment/vfs/AGENT_ID/org/experts/{TEAM}/knowledge/{SCOPE}.md
```

Ensure the parent directory exists first: `mkdir -p /root/.augment/vfs/AGENT_ID/org/experts/{TEAM}/knowledge/<parent-of-scope>/`. There is no breadcrumb file for simple-memory teams.

# What to write

One bullet per fact, appended under the matching `##` heading (create the heading on first use). The set of allowed headings and the exact bullet shape are supplied by the team's binding wrapper — they are team-specific because they encode what the team's readers (`kb://skills/memory/load-memory.md` consumers) will pivot on.

Do **not** emit `## <short title>` subsections, `Source: / Paths: / Date:` metadata blocks, or `(seen N× — sources; last anchor; persistence)` annotations — those belong to the noisy-memory writer. `Source` is implicitly `human-feedback` for every bullet this skill writes; the team's bullet shape typically embeds an inline anchor (e.g. a permalink + date) instead of a metadata block.

# Veto and correction

If a human in the same session vetoes a rule they (or a teammate they're acting on behalf of) earlier set (*"forget that rule"*, *"undo the one about compliments"*):

1. **Veto (delete):** whole-line delete the matching bullet from `knowledge/{SCOPE}.md`. This is the only deletion path — there is no curator to garbage-collect later. Acknowledge briefly: `Got it — removed.`
2. **Correction (amend):** delete the original bullet and append a new one with the corrected wording. Acknowledge: `Updated — saved the corrected version.`

Scope vetoes to bullets written in the **current session** plus bullets the same teammate authored. Do not delete bullets authored by other teammates in prior sessions on a single in-thread veto — the team's binding wrapper may tighten or widen this rule.

<include src="kb://skills/memory/internal-vfs-conflict-handling.md" />
