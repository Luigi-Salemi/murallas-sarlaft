---
name: verification-plan-selection
description: Priority-ordered plan selection for the End-to-End Verifier — PR body section, human-edited playbook, auto-curated knowledge procedure, broader-ask check, then bounded autonomous investigation before asking the requester. Carries the e2e-only and stubs-as-absent filters and the `plan_source` taxonomy (`pr_body`, `playbook`, `knowledge`, `inferred:{where}`, `human:{handle}`, `none`).
---
# Plan selection

Pick a plan in priority order. At each step apply two filters before accepting a candidate:

- **E2E-only.** A candidate whose steps are entirely unit tests, in-process Bazel tests, or plain builds → filter to empty, treat as absent. Mixed candidates → narrow to the e2e/integration subset.
- **Stubs-as-absent.** Per the playbook-absence rule in the verification VFS-and-playbooks skill (no `## Exercise`, only `## Out of scope`, declared skeleton).

Record `plan_source` and the concrete Setup + Exercise commands.

## 1. PR body section

Scan the PR body for a heading (case-insensitive) `## Verification`, `## Testing`, `## Test plan`, or `## How to test`. Take content under it until the next top-level `##`. Usable after filters → `plan_source = pr_body`. Else fall through.

## 2. Playbook file

Read the human-edited playbook file at `org/experts/verification/playbook/{owner}/{repo}.md` (already loaded by the verification-load-memory skill). If present and non-stub, take its `## Setup` / `## Exercise` (and optional `## Teardown`) — multi-scope rules apply per the verification VFS-and-playbooks skill. Usable after filters → `plan_source = playbook`. Else fall through.

## 3. Knowledge file (captured procedures)

Scan the auto-curated knowledge file at `org/experts/verification/knowledge/{owner}/{repo}.md` (already loaded by the verification-load-memory skill) for `Kind: procedure` bullets whose `Paths:` glob matches the PR's changed files or whose topic heading plainly applies. A knowledge bullet constitutes a plan when it carries a complete Setup + Exercise pair (matching commands or a clearly named procedure sequence) end-to-end. Take those commands; multi-scope rules apply per the verification VFS-and-playbooks skill when several procedures match. Usable after filters → `plan_source = knowledge`. Else fall through.

`Kind: oracle` / `noise` / `guardrail` bullets are advisory and bias later phases but do not by themselves constitute a plan; a partial procedure (Setup only, or Exercise only) likewise falls through to step 5 where it informs the bounded investigation.

## 4. Broader-ask check

If the user's ask names a scope the selected plan does not cover, run the selected plan first (still useful signal), then proceed to step 5 to cover the missing scope.

## 5. Investigate before asking (autonomy-first)

When nothing is selected, the selected plan has a missing-scope gap, or the playbook has `## Exercise` but no `## Setup`, spend bounded effort (~10 tool calls / a few minutes):

- **Read common config/docs** in the checked-out repo for entry points: e2e test configs (`playwright.config.*`, `cypress.config.*`, `e2e/`, `tests/e2e/`, `integration/`), container/orchestration descriptors (`docker-compose.*`, `Dockerfile`), package-manager scripts (`package.json` `scripts.e2e|test:e2e|dev|start|serve`, `pyproject.toml`/`Cargo.toml`/`go.mod` equivalents), build-tool targets (`Makefile`, Bazel/Buck/Gradle/Maven targets matching `e2e`/`integration`/`smoke`/`serve`/`dev`), CI configs (`.github/workflows/*`, `.gitlab-ci.yml`, `.circleci/`), and any nested agent or testing docs (`AGENTS.md`, `CONTRIBUTING.md`, project-local `docs/` or `_docs/`).
- **Check profile and experience** for prior runs in this or a comparable repo.
- **Infer Setup + Exercise.** If investigation surfaces plausible entry points, form a concrete plan and run it. `plan_source = inferred:<where>` (e.g. `inferred:package.json`, `inferred:_docs/deployments.md`).
- **No e2e surface.** If investigation confirms no e2e/integration coverage is reachable, apply the no-e2e-surface rule from the verification e2e-scope skill (return `skipped_not_applicable` with `plan_source: none`; **not** `missing_plan`).
- **Still cannot pin it down** (e2e plausibly exists but no safe entry point, unknown command shape, missing credential, infra unreachable, ambiguous entries): send `needs_clarification` with `kind: "missing_plan"` describing what was searched and what is blocking, end the turn. When the requester replies with steps, treat those as the plan, `plan_source = human:<handle>`.

Investigation is read-only except for already-allowed operations (branch checkout, dev-namespace deploys). Default-to-ask for anything potentially destructive.

# Resuming on a requester reply

A user message arriving mid-session (forwarded Slack reply, next `cosmos verify` PR comment) is the answer to the most recent clarification. Resume at the step that issued it (typically step 5). Increment the clarification round-trip counter; once the verifier's per-session clarification cap is exhausted, return `verdict: unable_to_verify` rather than asking again.
