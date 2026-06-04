# Operational Reference

Internals, limits, lifecycle details, and troubleshooting for Cosmos.
This covers things you can't discover from `auggie cloud --help`.

## System Prompt Behavior

The **default system prompt** turns a base LLM into a coding agent — it teaches
the model how to use tools (file editing, codebase retrieval, shell), how to
plan and execute multi-step tasks, how to write and run tests, and how to
make conservative, well-scoped code changes. Without it, the model has no
guidance on tool usage or coding workflows.

When `includeDefaultSystemPrompt: true` (the default), the platform prepends
the default system prompt to the expert's custom `systemPrompt`. The custom
prompt is **appended**, not replaced.

- `includeDefaultSystemPrompt: true` + custom prompt → default + custom
- `includeDefaultSystemPrompt: true` + empty prompt → default only
- `includeDefaultSystemPrompt: false` + custom prompt → custom only

**Most experts should leave this `true`** and use the custom `systemPrompt` to
add role-specific behavior on top. Set it to `false` only if you need full
control over the system prompt (e.g., a non-coding agent).

## Capability → Tool Mapping

Agents start with the default Auggie filesystem/terminal tool set. Additional
integrations are granted by capabilities. In the expert YAML, capabilities are
listed by name under `spec.expert.capabilities`.

| Capability | Tools Provided | Safety |
|-----------|----------------|--------|
| `WEB_ACCESS` | `web-search`, `web-fetch` | Safe |
| `GITHUB` | `github-api` (acts as the user) | Unsafe |
| `GITHUB_APP` | `github-app-api` (acts as the org GitHub App; can receive webhooks) | Unsafe |
| `LINEAR` | `linear` (acts as the user) | Unsafe |
| `LINEAR_APP` | `linear-app` (acts as the team Linear App; can receive webhooks) | Unsafe |
| `SLACK` | `slack-api` | Unsafe |
| `CUSTOM_WEBHOOK` | `list-webhooks`, `subscribe-event` for `CUSTOM` | Safe |

### CLI Tools

Filesystem and shell tools are provided by the Auggie process for each session;
`CLI_TOOLS` is deprecated as a capability marker. When a user additionally
provides local CLI tools via `auggie cloud session provide-tools`, those tools
are scoped to the user's workspace. The shell sets `AUGMENT_AGENT=1` so scripts
can detect agent execution.

## VM Lifecycle

### Provisioning

1. `CreateCapability` validates resource limits (CPU ≤ 8, RAM ≤ 16 GiB)
2. Scoped auth token generated for the capability
3. Modal sandbox provisioned with auth token + environment variables
4. VM boots, downloads CLI, calls `ConnectCliVm`
5. Capability status transitions: INITIALIZING → READY

### Heartbeating

- CLI sends heartbeats every ~5 seconds
- VM is **stale** if last heartbeat > 30 seconds old
- Stale VMs are excluded from message routing

### Timeouts

| Type | Default | What happens |
|------|---------|-------------|
| Hard timeout | 24 hours | VM is always stopped after this, even if active (`ModalMaxTimeoutSeconds` in `modal_vm_lifecycle_manager.go`) |
| Idle timeout | 20 minutes | VM is stopped if no tool activity for this long (`defaultIdleTimeout` in `cron_tasks.go`) |

### Snapshot and Restore

When a VM is stopped (timeout or explicit stop):
1. Queue is paused (messages buffered, not delivered)
2. Filesystem snapshot taken
3. `active_generation` bumped atomically
4. VM terminated

On restart:
1. New VM provisioned from snapshot
2. CLI connects with new generation number
3. Capability becomes READY; queued messages drain to new VM
4. Old VM (if still alive) is **fenced out** by generation comparison

### Generation Fencing

Each capability has an `active_generation` counter. Each VM has a generation.
Message routing picks the VM with the **highest generation**. This prevents
stale VMs from receiving work after a snapshot-restore cycle.

## Quotas and Limits

### Agent Limits

Cosmos enforces a **tenant-wide active VM cap** via the VM admission
controller (`services/poseidon/server/service/vm_admission_controller.go`):

| Scope | Default | Source |
|-------|---------|--------|
| Active VMs per tenant | 1000 | `DefaultMaxActiveVMsPerTenant`, overridable by the `poseidon_vm_admission_max_active_per_tenant` feature flag |

When the cap is reached, new sessions queue for up to
`DefaultMaxQueueWaitTime` (10 minutes) waiting for a slot before failing
with `ResourceExhausted`. Per-user caps are not enforced by the
admission controller today; contact support if you need a tighter
ceiling.

### Message Queue Limits

| Limit | Value | What happens when exceeded |
|-------|-------|---------------------------|
| Max queued messages | 500 | `ResourceExhausted` error |
| Max queued message bytes | 8 MB | `ResourceExhausted` error |

Duplicate messages (same EventID) bypass capacity checks via idempotency.

### VM Resource Limits

| Resource | Max |
|----------|-----|
| CPU cores | 8 |
| Memory | 16 GiB |

## Stuck Agents: Diagnosis and Recovery

When an agent can't make progress, the reconciler assigns a `StuckReason`.
These are diagnostic — each has a clear recovery path.

| StuckReason | Meaning | Recovery |
|-------------|---------|----------|
| `vm_creating` | VM is being provisioned | Wait; usually resolves in 1-2 minutes |
| `vm_start_failed` | VM failed to boot | Check environment config; rebuild image |
| `auggie_start_failed` | VM is up but agent code failed | Check system prompt / capabilities for errors |
| `awaiting_cli` | Agent started, waiting for CLI connection | User needs to run `provide-tools` or VM needs to connect |
| `drain_failed` | Messages failed to deliver to agent | Check heartbeat; VM may have crashed |
| `dead_lettered` | Agent stuck > 30 minutes | **Not recoverable** — delete and recreate the session |

The reconciler escalation path: `DRAIN_INBOX` → `START_AUGGIE` → dead letter.
If the VM is stopped during `DRAIN_INBOX`, the reconciler escalates to
`START_AUGGIE` to restart it.

**Dead letter threshold: 30 minutes.** Agents stuck longer than this stop being
retried. Delete the session and create a new one.

## Environment Variables in VMs

Agents running in Modal VMs have access to:

| Variable | Content |
|----------|---------|
| `AUGMENT_SESSION_AUTH` | JSON with `accessToken`, `tenantURL`, `scopes` |
| `POSEIDON_ENDPOINT` | gRPC endpoint for the Cosmos backend |
| `CAPABILITY_INSTANCE_ID` | ID of the capability instance |
| `AUGMENT_AGENT` | `"1"` — set on shell processes so scripts can detect agent |

Custom environment variables can be passed via `ModalVMCapabilityConfig`.
Secret names are transformed: hyphens/periods → underscores, uppercase.

To **add your own environment variables** (API keys, tokens, custom
config) to a cloud VM, create a user secret in the webapp's Secrets
Manager — it is auto-injected as `$UPPER_SNAKE` at session start. See
`secrets-and-access.md` § Setting Environment Variables in a Cloud VM.
For environment-bundle-scoped defaults (baked into an environment, not
per-user), use the `spec.environment.environmentVariables` field on the
environment bundle — see `cloud/environments.md` § Environment Variables.

## Environment Git Behavior

On VM startup/refresh, the environment checks the Git repo state:
- If `HEAD` is invalid **and** the repo is clean (no local changes), it repairs
  the reference automatically
- If the repo has local changes, it does **not** repair — this preserves work
  in progress
- Snapshot restore preserves the full filesystem, including uncommitted changes

## Session Data Sync

Session state syncs to GCS via rclone at turn boundaries (after
`ChatResponseGenerated` and `ToolResultsGenerated` events). This makes session
data available to agents via `~/.augment/sessions/`.

## Optimistic Concurrency

All resource mutations (experts and environments) use `metadata.resourceVersion`
for optimistic locking:
- `apply` fails with a stale-version error if another user edited the resource
- Recovery: re-export to get the latest `resourceVersion`, merge your changes,
  apply again

Triggers are embedded in expert bundles under `spec.triggers`, so they share
the parent expert's `resourceVersion` — a trigger edit and the surrounding
expert edit are applied as a single atomic update.

## Troubleshooting

### Agent never receives messages

1. Check heartbeat — VM must be heartbeating within 30 seconds
2. Check connection mode — must be AGENT mode (not PROVIDE_TOOLS)
3. Check generation — old VMs are fenced out after snapshot-restore

### Expert apply rejected

`resourceVersion` is stale. Re-export the expert, merge changes, apply again.

### Session stuck after snapshot

Expected. The new VM has a new generation; the old VM is fenced out. Wait for
the new VM to connect (usually 1-2 minutes).

### Trigger not firing

1. Check `auggie cloud integration status` — is the integration connected?
2. Check `auggie cloud event list --source <source>` — are events arriving?
3. Test filter: `auggie cloud event list --payload-filter '<your-filter>'`
4. Re-export the parent expert (`auggie cloud expert export <id>`) and verify
   the `spec.triggers[]` block has the expected `name`, `type`, `eventType`,
   and `filter`.
