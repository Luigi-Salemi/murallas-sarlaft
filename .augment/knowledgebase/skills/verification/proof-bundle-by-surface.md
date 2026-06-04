---
name: verification-proof-bundle-by-surface
description: Proof-bundle requirements per verified surface for the End-to-End Verifier (UI/browser, IDE UI, CLI/TUI, API/RPC, async, feature flag/config, logic-only). Every primary artifact needs an evidence sentence and a paired revert-check sentence; "look identical" fails proof. Missing required artifacts → `unable_to_verify`. Used by the End-to-End Verifier.
---
# Proof bundle

After running the tailored proof check, produce a proof bundle appropriate to the verified surface. Do not return `passed` unless the bundle contains verdict-grade evidence for the validated intent.

# Interpret every primary artifact

For each screenshot, API response, CLI output, log/trace, event, or test result, write one evidence sentence and one paired revert-check sentence:

- `Artifact shows: [what is observable] — this [confirms / contradicts / is inconclusive for] the expected outcome because [reason].`
- `If reverted: artifact would [differ how, or "look identical"] because [code path X] [executed / did not execute].`

If the revert-check sentence honestly says "look identical", the artifact is **not** proof of the change — pick a different scenario that exercises the changed code path, or downgrade the verdict and remove the unsupported claim. Do not count an artifact as proof unless its observable content supports the validated intent and the revert-check shows the artifact depends on the changed code path. Supporting setup/build artifacts may be reported separately, but they do not satisfy proof by themselves.

When baseline comparison applies, include the equivalent `Before/Base` and `After/PR` artifacts in the bundle; the decision lives in the verification-proof-plan skill, execution in the verification-baseline-comparison skill, and rendering in the verdict-comment skill.

# Required by surface

- **UI/browser/webapp:** at least 2 screenshots of the relevant state change, and one machine-checkable assertion.
- **IDE UI:** screenshots of the relevant state change, plus IDE/plugin/sidecar state or logs proving the changed behavior.
- **CLI/TUI:** command, exit code, stdout/stderr, and a direct assertion of the changed output/state. For TUI or any CLI output where layout, colors, cursor position, or rendered glyphs carry the proof (anything stdout/stderr capture cannot reproduce), also include a screenshot of the terminal at the relevant state.
- **API/RPC/service:** request shape, response status/fields, a direct assertion, and redacted logs/traces/correlation IDs when useful. For "preserved" or "still works" claims, the request must reach past any early-exit layer (validation, auth, signature, flag default) — see the shallow-rejection-trap skill.
- **Async workflow/webhook/job:** trigger evidence, downstream state/event/log evidence, correlation IDs, and retry/timing evidence when relevant.
- **Feature flag/config:** evaluated flag/config value, target environment, and observed gated behavior.
- **Logic-only changes:** targeted unit/integration test evidence may be primary only when no higher-level proof path exists; explain why e2e/integration proof is not applicable.

# Missing artifacts

If required artifacts for the selected proof path are missing, do not return `passed`; return `unable_to_verify` with the missing proof artifact/path.
