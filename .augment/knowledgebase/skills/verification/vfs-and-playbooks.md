---
name: verification-vfs-and-playbooks
description: Canonical VFS layout for the End-to-End Verifier — three tenant-scope memory files per repo (human-edited playbook, append-only breadcrumbs, auto-curated knowledge), file-ownership rules sibling skills cite, and the guidance-priority order. Never reads or writes `user/experts/verification/...`; verdict-cited proof artifacts go to hosted artifacts, not VFS.
---
# VFS scope

`org/experts/verification/...` is the **organization-scope** VFS root. The verifier reads and writes only these three memory files per repo:

- `org/experts/verification/playbook/{owner}/{repo}.md` — human-edited playbook. **Read-only** for the verifier on every run.
- `org/experts/verification/breadcrumbs/{owner}/{repo}.md` — append-only structured-Markdown breadcrumbs written by the end-of-run feedback-capture binding.
- `org/experts/verification/knowledge/{owner}/{repo}.md` — auto-curated knowledge file, fully owned by the generic `curate-knowledge` and `prune-and-compact` skills (whole-file rewrite from the breadcrumb set).

Forbidden: any path under `user/experts/verification/...`, any other expert's files, anywhere outside the three files above, and **any** verdict-cited proof artifact under `org/experts/verification/proof/...` or elsewhere in VFS — proof artifacts upload to hosted artifacts (per the cosmos hosted-artifacts skill) and are linked by URL from the verdict comment. The playbook file is human-edited; the verifier may load it but must never write to it.

# Playbook file (human-edited, read-only for the verifier)

```
## Setup
…
## Exercise
…
## Teardown
…
## Notes
…
```

- `## Setup` — build and bring up the code under test.
- `## Exercise` — e2e/integration commands to run.
- `## Teardown` (optional) — cleanup.
- `## Notes` (optional) — gotchas, discriminators, infra quirks every run should preload.

A repo can run the verifier with no playbook file at all — plan selection falls through to the next priority (PR body, memory, broader-ask, bounded investigation).

**Multi-scope.** When `## Setup` / `## Exercise` carry `### …` scope sub-sections naming distinct projects/surfaces in the repo (e.g. `### api`, `### web`, `### worker`), pick scopes whose declared path prefixes match the PR's changed files. If multiple match, run all matching setups in file order.

A playbook file without `## Exercise` (or legacy `## Commands`), with only `## Out of scope` content, or self-declared skeleton → treat as **absent** for plan selection.

# Knowledge file (auto-curated)

```
## services/billing/**
- bullet… *(seen 4× — 2 human-feedback, 2 agent-inferred; last https://github.com/...; permanent)*
## (cross-cutting)
- …
```

Bullets under `##` matcher headings (file-path globs like `## services/billing/**`, verification topics like `## Known flakes`, or `## (cross-cutting)`). Rewritten end-of-run from breadcrumbs by the generic memory skills (`curate-knowledge`, then `prune-and-compact`) bound to `TEAM=verification` and `SCOPE={owner}/{repo}`. The verifier never edits this file by hand; all writes go through the breadcrumb file and the generic curate/prune flow.

The auto-curated content must not collide with the playbook's reserved section titles. `## Setup`, `## Exercise`, `## Teardown`, `## Notes` are reserved for the playbook file; the knowledge file uses different titles (`## Setup notes`, `## Known flakes`, path-glob headings, etc.). The feedback-capture binding enforces this on the writer side.

# Guidance priority

Highest → lowest:

1. **Current run** — user request, PR title/body/diff/comments, requester guidance, this run's runtime evidence.
2. **Playbook file** — authoritative for Setup/Exercise/Teardown when present.
3. **Knowledge file** — captured priors. A `Kind: procedure` bullet carrying a complete Setup + Exercise pair may stand in as a plan when the playbook is absent (see the verification plan-selection skill); other kinds (`oracle`, `noise`, `guardrail`, …) are advisory and bias their consuming phase without overriding the current run.

On conflict, prefer the higher-priority source and surface the discrepancy in the verdict.
