# Residents

> Availability: This feature is not enabled anywhere right now.

A **Resident** is a Cosmos top-level primitive for *long-lived* agent
sessions. A Resident **references an Expert** (the session shape —
system prompt, capabilities, MCP config, VM config) and pairs that
Expert with a single durable agent session that outlives any individual
web request or CLI invocation. The session is explicitly started and
stopped by the user.

Compared to the sibling Expert primitive — which is a session *template*
used to spawn fresh sessions on demand — a Resident keeps one session
from a given Expert alive across Start/Stop cycles. The Resident does
not duplicate Expert config; if a Resident needs a different shape,
create or reference a different Expert.

Think of Residents as the "always-on assistant" shape: a customer-success
agent that keeps watching a Linear project, a deploy-watcher tied to a
single environment, a research agent that batches questions across a week.
Anywhere the natural unit is "one session that I want to keep coming back
to" instead of "spin one up per task."

## Lifecycle

| State      | Description                                                  |
|------------|--------------------------------------------------------------|
| `stopped`  | No non-archived session is bound (initial state, or every prior session has been archived). |
| `running`  | A non-archived session is bound (`current_agent_id` is set). |

Status is **derived** from the session, not stored on the resident: a
resident is `running` iff there is an `AgentState` row with
`ResidentID = <this>` and `Archived = false`. The session's
`archived` flag is the single source of truth — the `Resident` row's
`current_agent_id` / `started_at` fields are populated by the server
on every read from the `AgentState_ResidentID` index, so a session
archived or unarchived through any other code path (`/sessions` UI,
admin RPC) stays in sync with the resident's status with no
reconciliation needed.

Transitions:

- `Create` → `stopped`. Requires `expert_id`; the server verifies the
  Expert exists in the caller's tenant and the caller has OLAC `use`
  permission on it. Rejects with `InvalidArgument` (missing),
  `NotFound` / `PermissionDenied` (not callable).
- `Start` → `running`. Idempotent: if a non-archived session already
  exists, returns it unchanged; otherwise delegates **fresh** session
  creation to
  `ExpertService.CreateAgentFromExpert(expert_id, resident_id=…)` so
  the OLAC `use` check, worker plumbing, expert-origin metadata, and
  any future Expert-side enhancements apply uniformly. Newly-created
  sessions get `PoseidonAgentContext.resident_id` stamped atomically
  via `CreateAgentFromExpertRequest.resident_id` (field 26).
  Archived prior sessions are **not** resumed — every Start boots a
  clean session. Chat history, daemon binding, and any event
  subscriptions configured in a previous session do not carry
  forward; subscriptions the resident needs every Start should be
  declared at the Expert level so they are recreated on each boot.
- `Stop` → `running` becomes `stopped`. Archives the bound session
  via `ArchiveAgent` (soft-stops event subscriptions, preserves chat
  history). The archived session stays visible in `/sessions` as
  history but is never resurrected by a subsequent `Start`.
- `Delete` → resident row removed and **every** session ever bound to
  this resident is cascade-archived first. No chat history is lost;
  only the resident configuration row goes away.
- `Update` → modifies the configuration (including swapping
  `expert_id`). Does NOT restart the running session; the next time a
  fresh session is created (after the current one is deleted from
  `/sessions`), the new Expert reference takes effect.

A resident has **at most one** non-archived session at a time. `Start`
is a no-op when the resident is already running.

## API surface

The `ResidentService` gRPC service exposes the eight RPCs you would
expect: `CreateResident`, `GetResident`, `UpdateResident`,
`DeleteResident`, `ListResidents`, `StartResident`, `StopResident`,
`ListResidentSessions`. See `services/poseidon/residents.proto` for the
canonical field-level documentation.

`ListResidents` returns all tenant-scoped residents plus the caller's
user-scoped residents by default. A `scope` filter narrows the result.

`ListResidentSessions` returns every session ever bound to this
resident, ordered most-recent first, including archived ones. Each
entry is tagged `active` (non-archived) or `archived`.

## Initial message

`ResidentConfig.initial_message` is the first user message sent each
time the resident is started. The MVP's whole point is "an agent that
periodically does work", so the message is what tells the agent what
"work" actually means — without one, Start succeeds but the bound
session sits idle with an empty queue.

Override semantics (deliberately *replace*, not append):

| Resident `initial_message` | `StartResidentRequest.initial_message` | Effective first message |
|---|---|---|
| set | set | per-Start value (one-shot override) |
| set | unset | resident's `initial_message` |
| unset | set | per-Start value |
| unset | unset | the referenced Expert's `initial_messages` (or idle if those are also empty) |

When any resident-level or per-Start message is present the underlying
`CreateAgentFromExpertRequest.send_initial_messages` is set to `false`,
so the Expert's `initial_messages` are intentionally *not* prepended.
Two ways of seeding the same session would be a footgun.

The webapp's Create dialog requires the field (UI-level only — the proto
field stays optional for power users). The CLI's `apply` warns when a
bundle omits `spec.initialMessage` instead of refusing it, because a
deliberate fall-through to the Expert's messages is a legitimate (if
rare) shape.

## CLI

```
auggie cloud resident list
auggie cloud resident get <id>
auggie cloud resident start <id>
auggie cloud resident stop <id>
auggie cloud resident delete <id>

# Bundle workflow (config-as-code):
auggie cloud resident init <file>        # writes a template bundle
auggie cloud resident export <id> [-o f] # dumps a live resident as YAML
auggie cloud resident validate <file>    # schema-checks the bundle
auggie cloud resident diff <file>        # diffs bundle vs live state
auggie cloud resident apply <file>       # creates/updates, reconciles desiredState
```

All commands are hidden until the feature is enabled for your tenant.

Bundle shape (see `clients/cli/src/cli/commands/cloud-agent/resident/bundle.ts`
for the canonical Zod schema):

```yaml
apiVersion: poseidon.augmentcode.com/v1alpha1
kind: Resident
metadata:
  name: my-resident
  description: optional
spec:
  expertId: exp_…           # required, FK to a CloudExpert
  visibility: tenant        # tenant | user
  desiredState: started     # started | stopped
  initialMessage: |         # optional but strongly recommended
    Check the deploy queue and report any stuck rolls.
```

## Webapp

The Residents page lives at `/automations/residents` (the legacy
`/residents` path redirects) and shows a table of residents with their
bound session (when running) plus controls to Start/Stop. The Create
dialog requires an initial message (see "Initial message" above). The
Sessions list page surfaces a "Resident: <name>" badge on rows whose
session came from a resident, with a click-through to the resident.

The page is hidden from the sidebar's Automations group until the
feature is enabled.

## Storage shape (Spanner)

```
CREATE TABLE Resident (
  TenantID         STRING(36)  NOT NULL,
  ResidentID       STRING(36)  NOT NULL,
  Scope            STRING(64)  NOT NULL,
  UserID           STRING(256),
  Config           `poseidon.ResidentConfig` NOT NULL,
  CreatedBy        STRING(256),
  CurrentAgentID   STRING(36),
  StartedAt        TIMESTAMP,
  CreatedAt        TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  UpdatedAt        TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  Version          INT64 NOT NULL DEFAULT (1)
) PRIMARY KEY (TenantID, ResidentID)
```

Tenant isolation: every row carries `TenantID` and storage methods take
`tenantID` explicitly — no auto-tenant magic. Mirrors the Expert pattern.

`PoseidonAgentContext.resident_id` (field 37) is the inverse pointer.
`StartResident` stamps it on the new session, and the
`AgentState_ResidentID` generated column + NULL_FILTERED index make
"list every session ever bound to this resident" a fast prefix scan.

## Gaps tracked for the next iteration

The MVP intentionally leaves several pieces deferred so the API and
storage shape can settle before we invest in the periphery:

- Soft-delete + version history (mirror Expert's `DeletedAt` +
  `ExpertVersionHistory`).
- OLAC scope-toggle + `SetResidentTenantAccess`.
- Full `ListResidentSessions` over the `AgentState_ResidentID` index.
- `auggie cloud resident init|export|validate|diff|apply` bundle flow.
- Auto-restart on VM crash. (Today, a resident whose VM dies stays in
  `running` state with a dead `current_agent_id` until the user notices
  and calls `Stop` + `Start`.)
- Per-resident quotas distinct from the Expert quota.

Track these in the residents milestone in Linear before promoting the
feature flag.
