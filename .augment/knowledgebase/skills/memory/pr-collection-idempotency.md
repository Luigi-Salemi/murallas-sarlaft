---
name: memory-pr-collection-idempotency
description: Idempotency check for PR-triggered breadcrumb writers — scan the team's per-scope breadcrumbs file for an existing section whose prose contains the current PR's URL, and skip writing if found. Generic append-only "have I already processed this PR?" pattern.
---
# PR collection idempotency

Before appending a new PR-summary section to the team's per-scope breadcrumbs file, scan the existing file for a section that already covers this PR. The team name (`{TEAM}`) and the scope key (`{SCOPE}`, typically `{owner}/{repo}` for repo-bound work) are supplied by the calling expert's context block.

1. Open the team's per-scope breadcrumbs file at
   `/root/.augment/vfs/AGENT_ID/org/experts/{TEAM}/breadcrumbs/{SCOPE}.md`.
   If it does not exist, there is nothing to dedup against — proceed to append.

2. Parse it as structured Markdown — each breadcrumb is one `## `-delimited section.

3. For each section, scan its prose for the current PR's URL
   (`https://github.com/{owner}/{repo}/pull/{pr_number}`). If any section's prose contains this URL, this PR has already been collected. Output `Already collected PR #{n} — skipping.` and stop. Do NOT append a duplicate section.

4. Otherwise, find sections whose prose references this PR URL from an earlier in-session human-feedback write (e.g. by a Pair Reviewer flow). Their prose is the "in-session feedback" the calling expert may want to quote verbatim in the new summary it appends.

5. Do NOT delete or rewrite existing sections. The team's curator is the only step that rewrites a breadcrumbs file in full (during compaction).
