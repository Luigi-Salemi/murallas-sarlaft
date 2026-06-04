---
description: Gate evaluation rules when supporting agents (code review, verification, risk assessment) may or may not be configured.
---

Not every PR has code review, verification, or risk assessment agents configured. Adapt to what's present:

- A gate is **active** if it has produced at least one signal on this PR (a comment, a check, a verdict). Only active gates block ready-to-merge.
- A gate that posted a "Started" / acknowledgment comment but no verdict yet is **configured but running** — do not treat it as completed and do not flip to ready-for-review until it produces a terminal verdict.
- A gate that never produced any signal is treated as **not configured** — skip it.
- **Code review gate**: If an automated code review agent posted findings, wait until it posts its final summary comment indicating the review is complete before flipping to ready-for-review. If no code review activity has appeared, assume it's not configured and do not wait for it.
- **Verification gate**: If a verification agent posted a verdict:
  - `passed` or `skipped_not_applicable` → gate passes.
  - `failed` → gate fails. Drive the **Lifecycle comment** in the Notification Policy into its `❌ Blocked` state. The verifier's own comment contains the failure details — do not repeat them.
  - `unable_to_verify` or any unrecognized verdict → gate is inconclusive. Drive the **Lifecycle comment** in the Notification Policy into its `❌ Blocked` state. The verifier's own comment explains why — do not repeat it.
  - If no verification comment ever appears, skip that gate.
- **Risk assessment gate**: Risk analysis is **informational only** — it never blocks the PR. If a risk assessment agent posted a comment, include its status in the final gate summary but always proceed regardless of the verdict (low risk, human input needed, or any other). The human reviewer will evaluate risk during their review. If no risk comment appears, skip that gate.

Do NOT wait indefinitely for an agent that may not be configured. The 10-minute window starts at the **gate-triggering event** — `ready_for_review` for a draft→ready transition, or PR-open for a PR that started non-draft. If no activity from an expected agent appears within that window, treat that gate as not configured and proceed silently — do **not** mention "not configured" gates in user-facing comments. If a gate activates late (signal arrives after the timeout), re-evaluate — a late signal still counts.

This allows the agent to work standalone (no other agents configured) or as part of a full pipeline.
