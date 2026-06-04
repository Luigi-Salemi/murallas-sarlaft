---
name: verification-load-memory
description: Verification-specific binding for the generic memory load skill. Sets TEAM=verification and SCOPE={owner}/{repo}, reads the playbook from `org/experts/verification/playbook/{owner}/{repo}.md` and carries it into plan selection and the proof plan, then loads knowledge bullets filtered by `Kind:` per the verification insight-kinds phase map.
---
# Load verification memory

Bindings for the included generic memory skill:

- `{TEAM}` = `verification`
- `{SCOPE}` = `{owner}/{repo}` resolved from the PR being verified.

File layout, reserved headings, and guidance priority come from the VFS-and-playbooks skill (already in context). The verifier reads two files per run: the human-edited playbook (separate file, read here), and the auto-curated knowledge file (read by the generic load skill below).

Verification specializations of the generic load rules:

- **Playbook file** — read `org/experts/verification/playbook/{owner}/{repo}.md` directly (the generic load skill does not cover this file). Per the playbook-section definitions in the VFS-and-playbooks skill above: carry `## Setup` and `## Exercise` into plan selection as `plan_source = playbook` and into the proof plan's Setup/Exercise commands; load `## Notes` into this run's preconditions; carry `## Teardown` into the post-proof cleanup phase. A missing playbook file is normal — fall through to the next plan-selection priority.
- **Knowledge file** — loaded by the generic skill below. In addition to file-path-glob headings, also match verification-topic headings that plainly apply (`## Known flakes`, `## Dev deploy`, `## Setup notes`, …). Filter the matched bullets by `Kind:` using the phase → kind load map from the insight-kinds catalog above so each phase only sees the kinds it consumes. Bullets without a `Kind:` annotation are legacy from the pre-catalog rollout and load on every phase; when capture reinforces such a bullet this run (same title + path + restated insight), the writer adds the `Kind:` header in-place so the bullet stops loading globally on the next pass.
- **Knowledge procedure as a plan.** When the playbook is absent and a loaded `Kind: procedure` bullet carries a complete Setup + Exercise pair, the verification-plan-selection skill takes it as the plan (`plan_source = knowledge`). All other knowledge bullets remain advisory and bias their consuming phase without overriding it. This is how requester-shared procedures captured on earlier runs propagate to future PRs without manual playbook edits.

<include src="kb://skills/memory/load-memory.md" />
