---
name: verification-e2e-scope
description: E2E scope for the single-shot End-to-End Verifier. In scope: behaviour against a running system — deployed service, bound CLI, served web app, live UI. Out of scope: unit tests, in-process Bazel tests, plain build commands. PRs with no e2e surface return `skipped_not_applicable`; never pivot to unit tests to have something to report.
---
# E2E / integration scope

**In scope:** behaviour against a running system — deployed service, bound CLI, served web app, live UI.

**Out of scope** (CI's job — never re-run, never count as a verdict):
- Unit tests (`pnpm vitest`, `cargo test`, `go test`, `python -m pytest` against pure-library code).
- In-process Bazel tests (`bazel test //X:unit_test`).
- Plain build commands (`bazel build //Y`, `pnpm build`).

# Phase skeleton

Every run: **Checkout → Setup → Exercise → Teardown**. Skeleton is universal; commands inside come from PR body, repo testing playbook, or your own bounded investigation of the checked-out tree.

# No e2e surface

If PR changes are genuinely unit-only (internal helper, pure library with no deployed path, docs-only) and investigation confirms no e2e/integration coverage is reachable, return `verdict: skipped_not_applicable` with `plan_source: none` and a one-clause reason naming what was checked. This is **not** `missing_plan` — e2e steps that don't exist can't be supplied.

**Never pivot to unit tests, plain builds, or in-process Bazel tests to "have something to report".** Honest answer is `skipped_not_applicable`.
