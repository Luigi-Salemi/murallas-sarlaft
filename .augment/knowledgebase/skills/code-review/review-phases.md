---
name: code-review-review-phases
description: Catalog of standard review phases (Purpose, Risk, Architecture & Design, APIs & Schemas, Correctness & Logic, Security, Tests, Readability & Consistency) with their lens, sub-lenses, and discussion-vs-findings classification.
---
# Review phases

The phases below are a catalog. The calling expert decides which to run for a given PR (see the phase-judgment guidance in the expert's prose) and may add a Knowledge Transfer section in Purpose when the change touches unfamiliar territory.

## Purpose

Discussion phase. The Purpose phase has two sections: Review Context (always included) and Knowledge Transfer (conditional).

*Review Context* — Explain what is needed to understand the change: what problem it solves, why it's being solved this way, and how the affected components relate to each other. Keep it focused on what's needed for the questions that follow. This is session-scoped.

*Knowledge Transfer* — Include this section only when Knowledge Transfer is flagged by upstream risk analysis, or when you discover something during your analysis that the human would not already know and that has clear future utility (e.g., a non-obvious invariant, a pattern in the codebase that explains why something is done a certain way, a subtle coupling between components). Format it as a bulleted list under a "**What's worth knowing beyond this PR:**" header. Each bullet is one sentence stating the insight. Do not include observations the human would already know from working in this codebase.

Use the discussion phase format. Do not raise specific findings yet.

## Risk

Findings phase. Cover:
- Scope of impact: which services, APIs, or components are affected?
- Backwards compatibility: does this change break any existing interfaces, contracts, or data formats? Are consumers of this code at risk?
- Deployment and rollback risk: does this require a particular deployment order, a migration, a feature flag, or special rollback procedures?
- Dependencies: are new libraries introduced? Are existing ones bumped? Are there supply chain, licensing, or maintenance burden concerns?
- Data and migrations: are schema changes safe? Is the migration script correct and reversible? Is the rollout order (migration before or after deploy) accounted for?

## Architecture & Design

Discussion phase. Explain how the solution is structured: the key abstractions, data flow, component boundaries, and any notable design decisions or trade-offs. Do not raise specific findings yet.

## APIs & Schemas

Findings phase. Run only if the PR introduces or modifies public or internal APIs (REST endpoints, RPC methods, event schemas, SDK interfaces, etc.) or data schemas (protobuf messages, database schemas, event payloads, config schemas, GraphQL types, etc.). Cover:
- Interface design: are endpoint/method names, parameters, and return types well-designed and consistent with existing conventions?
- Schema design: are field names, types, and defaults sensible? Are required vs optional fields correct? Is the schema forwards- and backwards-compatible?
- Error responses: are error codes and payloads meaningful and consistent?
- Versioning: does this change require a version bump? Is that handled?
- Schema migration: is the migration path clear for existing consumers/data?
- Documentation: are new or changed APIs/schemas documented (OpenAPI spec, proto comments, docstrings, README, changelog)?

## Correctness & Logic

Findings phase. Review the code for logic errors, edge cases, failure modes, off-by-one errors, nulls, and concurrency issues. Treat error handling as a distinct sub-lens: are errors caught, surfaced, and propagated correctly? Are error messages useful? Are failures silent where they shouldn't be? This is a static review focused on intent and judgment: do not run `bazel build`, `bazel test`, `cargo`, `pnpm test`, or any other build/test command while evaluating correctness. CI is responsible for build/test verification.

## Security

Findings phase. Review the code with an adversarial lens: input validation, authentication and authorization, injection risks, secrets in code, unsafe deserialization, and so on.

## Tests

Findings phase. Evaluate test coverage and quality. Are meaningful paths covered? Are assertions actually verifying behavior, or just confirming the code runs? Are edge cases and failure modes tested? Do not execute the suite: do not run `bazel build`, `bazel test`, `cargo`, `pnpm test`, or any other build/test command. The Tests phase evaluates the test code; CI is responsible for build/test verification.

## Readability & Consistency

Findings phase. Review for naming clarity, function size, comment quality (do they explain why, not just what), and consistency with patterns in the existing codebase. Include observability as a sub-lens: are new code paths instrumented with logging, metrics, and tracing consistent with how the rest of the codebase does it? Are log levels and metric names appropriate and consistent? Use the local checkout to check conventions. Findings here will typically be NITs or SUGGESTIONs.
