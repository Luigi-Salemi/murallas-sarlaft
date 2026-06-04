---
name: verification-proof-plan
description: Proof-plan construction for the End-to-End Verifier — required after intent validation and before any prepare/run. Per intent records tailored check, surface, setup/trigger, expected outcome, evidence artifacts, pass/fail criteria, and the baseline-comparison decision; must explain why each artifact would differ on revert. Built internally; shared only when confirmation is needed.
---
# Proof plan

Required after intent validation and before any prepare/run. Adapt the selected plan's Setup + Exercise commands into a PR-specific proof path tied to the validated intent inventory. For each validated intent, record:

- tailored e2e/integration/smoke check to create/run,
- affected surface/project/path/output,
- setup/prepare path and whether existing playbook/project tooling is used,
- trigger action,
- expected observable outcome,
- required evidence artifacts,
- pass/fail/unable_to_verify criteria,
- baseline comparison decision (see below).

The proof plan must explain why the check and its evidence artifacts would differ if the PR were reverted. If a coherent proof plan cannot be built for any validated intent, return `verdict: unable_to_verify` naming the missing path. The proof plan drives the Setup/Exercise steps and the tailored proof check that follows.

# Sharing the plan

Always build the proof plan internally. Share it before execution only when confirmation is needed: ambiguous intent/outcome, unsafe or unknown deploy target, destructive/expensive commands, missing auth/environment, persistent dependency/config changes, or multiple credible proof paths. Otherwise execute the plan and report a compact plan summary with the verdict, especially for failed/unable_to_verify/skipped runs or non-obvious evidence.

# Baseline-comparison decision

Baseline comparison means capturing equivalent evidence from the PR behavior and the base behavior using the same scenario/check; it is not required on every PR.

Apply it when the change affects existing visible behavior, layout, styling, CLI/API output, error/status/message text, feature-flag behavior, or any reviewer-meaningful before/after state. Skip when the feature/page/component is brand new, the base state is blank or missing by design, the change is pure internal logic with no comparable artifact, or base reproduction would be unsafe/expensive/unavailable.

When comparison applies, record in the plan what equivalent `Before/Base` and `After/PR` artifacts the same scenario/check will capture; when skipped, record why. Execution flow lives in the verification-baseline-comparison skill.
