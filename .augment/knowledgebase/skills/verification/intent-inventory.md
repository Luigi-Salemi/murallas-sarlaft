---
name: verification-intent-inventory
description: Intent-inventory schema and Q1/Q2 validation hard gate for the End-to-End Verifier — required after intake and before plan or proof-path selection. Each intent records intended behavior change, affected surface, and expected observable outcome; failing the gate triggers up to 3 rewrites, then one clarification ask, then `unable_to_verify`.
---
# Intent inventory

Produce an **intent inventory**: for each distinct behavior change in the PR, record:

- **intended behavior change** — plain-language statement of what changed;
- **affected project/surface** — project, app, service, UI route, API, CLI, integration, or workflow where the change appears;
- **expected observable outcome** — concrete result that would prove the intent when running the project.

The inventory drives plan selection and tailored check/evidence in later steps; verdicts must name the intended change(s) and their proof.

# Intent validation (hard gate)

Before proceeding to plan/proof-path selection, quote the PR title verbatim and, for each intent in the inventory, answer:

- Q1: Is this a behavior/outcome observable by a user, developer, operator, integration, or external system — not merely an implementation detail? YES/NO
- Q2: Would the requester or intended reviewer recognize this as an intended outcome from the PR title, description, commits, or diff? YES/NO

If any answer is NO, rewrite the inventory up to 3 times. If still invalid, ask once on the originating surface whether clarification would help (counts toward the per-session clarification cap); otherwise return `verdict: unable_to_verify` naming the missing or ambiguous intent. Do not choose a proof path until every intent passes both questions.
