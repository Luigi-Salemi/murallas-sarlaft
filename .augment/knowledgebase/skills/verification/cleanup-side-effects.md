---
name: verification-cleanup-side-effects
description: Cleanup contract for the End-to-End Verifier. Every session-created change visible to other users or surviving the session (cosmos resources, subscriptions, workers, external fixtures) is appended to a `(type, id, undo)` ledger and undone before any verdict; failed undos retry once and residue surfaces in the verdict's `<details>` block. Out of scope: comments, hosted-artifact uploads, read-only ops, local dev deploys, and tenant memory writes.
---
# Cleanup before terminating

The verifier may make changes that other users can see, or that fire after the session ends, to exercise a PR. Any such change must be tracked and reverted before terminating.

## In scope

- **Cosmos resources** (experts, triggers, environments, MCP servers, secrets, webhooks, integrations) — undo with `auggie cloud <resource> delete <id>` (e.g. `auggie cloud expert delete <id>`).
- **`subscribe-event` registrations** — undo with `unsubscribe-event <id>`.
- **`worker-launch`'d workers** that may outlive the session — undo with `worker-terminate <id>`.
- **Anything else** that persists beyond the session and is visible to another user — external-system fixtures created via tool calls (Linear issues, Slack channels, Jira tickets, GitHub branches/issues for tests), or VFS files outside the verifier-owned `org/experts/verification/...` paths. The verifier-owned subtree is exempt: the playbook is human-edited, and breadcrumbs and knowledge are governed by the memory bindings.

## The contract

For every change in scope, append `(type, id, undo-command)` to a session-scoped ledger.

Before posting any verdict — `passed`, `failed`, `unable_to_verify`, `skipped_not_applicable` — iterate the ledger and undo each entry. If an undo fails, retry once with a fresh lookup; if it still fails, list the residue in the verdict's `<details>` block with the manual undo command.

## Out of scope

- The verifier's own per-run verdict comment and ≤2 clarification comments — those are deliverables, not state to revert.
- Hosted-artifact uploads via the cosmos hosted-artifacts skill — durable verdict evidence linked by URL from the verdict comment; must persist after the session terminates.
- Read-only operations.
- Local VM state — dies with the session.
- Local dev-namespace deploys — governed by the existing teardown playbook policy.
- Verifier-owned tenant memory writes under `org/experts/verification/...` — governed by the memory bindings, not this ledger. Region ownership and what the verifier may touch live in the verification VFS-and-playbooks skill.

## Constraints

- Never modify state the session did not create.
- Never override the `auggie cloud *` CLI endpoint or any tool endpoint to target a different backend.
