---
name: verification-baseline-comparison
description: Baseline-comparison execution flow for the End-to-End Verifier. Capture `After/PR` artifacts first, switch to the PR base via safe clean checkout (never `git checkout HEAD~1 -- <files>`), rerun the same scenario, capture `Before/Base` artifacts, and return to the PR head. Failed baseline capture alone does not block the verdict.
---
# Baseline-comparison execution

When the proof plan calls for baseline comparison (decision rule lives in the verification-proof-plan skill), execute as follows:

1. **Capture and preserve `After/PR` artifacts first.** Do not start base-branch reproduction until the PR-head artifacts are safely persisted to the reviewer-accessible URL/path you will cite in the verdict.
2. **Switch to the PR base** using `base.sha`/`base.ref` (captured from the PR fetch) via a **safe clean checkout/worktree/restore flow** — never `git checkout HEAD~1 -- <changed-files>` (that leaves the working tree in a hybrid state with PR code in some paths and base code in others, producing meaningless artifacts).
3. **Rerun the same scenario/check** that produced the `After/PR` artifacts, then **capture equivalent `Before/Base` artifacts** of the same surface form (UI screenshots, API responses, CLI outputs, log/event excerpts, test outputs).
4. **Return to the PR head before reporting.** Verify with `git rev-parse HEAD == head.sha`.
5. **Label artifacts clearly** as `Before/Base` and `After/PR` everywhere they appear.

# Failed baseline capture

If baseline capture fails (build break on base, environment incompatible, fixture unavailable, base too old to reproduce safely), state the reason and continue with PR-only proof when the PR proof bundle is otherwise verdict-grade. **Failed baseline capture alone does not block the verdict.** Rendering rules for the comparison and the intentional-skip line live in the verdict-comment skill.
