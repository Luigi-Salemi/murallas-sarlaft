# Compute Models, MCP, and Skills

Three related topics that all answer the question "what can this agent
actually run and use, and where does it run?"

- **Compute models** — where the agent process itself lives (Cloud VM vs
  Daemon)
- **MCP servers** — external tools the agent can call
- **Skills** — repo-configured knowledge that the agent auto-loads

## Compute Models: Cloud VM vs Daemon

Agents need a machine to run on. Cosmos offers two options.

### Cloud VM (default)

A managed sandbox VM in Augment's cloud. This is what almost everybody
uses. See `cloud/environments.md` for the full runtime
model, and `operational-reference.md` § VM Lifecycle for the details on
provisioning, heartbeats, snapshots, and quotas.

**Use when**: automated workflows, always-on agents, codebases that don't
require machine-local access, agents that need to scale horizontally.

### Daemon

A **long-running local process** that runs on the user's own machine and
hosts agent processes there. It connects to the Cosmos backend over a WebSocket and
accepts `START_AGENT` / `STOP_AGENT` commands from the platform, spawning
and managing child agent processes locally.

**Use when**: code must not leave the machine, the agent needs native
access to local tools/build systems, instant iteration matters (no VM
allocation delay), or you want to run on custom hardware.

### Side-by-Side

| | Cloud VM | Daemon |
|--|----------|--------|
| Where the agent runs | Managed VM in Cosmos | Long-running process on the user's machine |
| Setup | Zero — just create a session | `auggie daemon` on the host |
| Codebase access | Cloned into the VM on first boot | Already on disk |
| Restart speed | ~30 s (VM allocation) | Near-instant (local process spawn) |
| Scale | Many concurrent agents | Limited by local machine resources |
| Best for | Automated / always-on workflows | Local dev, sensitive repos, fast iteration |

### `auggie daemon`

```text
auggie daemon [-n, --name <daemon-name>]   # defaults to hostname:workspace
              [--max-agents <n>]           # default 5
              [--workspace <path>]         # creates the dir if missing, then chdirs in
              [--vm-id <id>]               # use a specific VM ID (overrides persisted/auto-generated)
              [--new-vm-id]                # generate a fresh VM ID instead of reusing persisted
              [--pool-id <pool-id>]        # join a DaemonPool; persisted across restarts; clear with --pool-id=''
```

The command is **feature-flagged** behind `poseidonDaemonEnabled` (plus
`cliEnableCloudAgents`). If neither flag is on for a user, the command
exits with a clear error. The daemon:

1. Reads the current auth session (re-read on reconnect so `auggie login`
   in another terminal is picked up automatically).
2. Opens a WebSocket connection to the Cosmos backend.
3. Receives typed commands: `START_AGENT`, `STOP_AGENT`, `QUIT_DAEMON`,
   plus `KEEPALIVE` and `CONNECTED` for liveness.
4. Spawns child Auggie processes per `START_AGENT`; cleans them up on
   `STOP_AGENT`.
5. Survives terminal close (ignores `SIGHUP`), terminates cleanly on
   `SIGINT` / `SIGTERM` and stops all child agents.

Sessions routed to a daemon look identical in the webapp to cloud-VM
sessions — same session list, same session page. The difference is just
where the agent process lives.

> There is also a webapp page `/daemons` (feature-flagged by
> `poseidon_daemon_enabled`) for monitoring connected daemons — see
> `webapp.md`.

### Pinning an Expert to a Daemon or Pool

The expert bundle's `spec.expert.environment` block accepts a `type`
field that selects the execution target. The CLI schema
(`EnvironmentTargetTypeSchema` in
`clients/cli/src/cli/commands/cloud-agent/expert/bundle.ts`) defines
three values; an omitted `type` is treated as `base_image` for backwards
compatibility.

| `environment.type` | `environment.id` | Routing |
|---|---|---|
| `base_image` (default) | base image ID from `auggie cloud environment list` | Provisions a fresh cloud VM from the selected environment. May also set `environment.resources` to override CPU/memory. |
| `pool` | daemon pool ID (e.g. `pool-<uuid>`) | Routes the agent to the least-loaded online daemon in the pool. |
| `daemon` | live daemon VM ID (visible on the webapp `/daemons` page) | Routes the agent to that specific daemon. |

Examples:

```yaml
# Run on the least-loaded daemon in a pool
spec:
  expert:
    environment:
      type: pool
      id: pool-abc-123

# Pin to a specific live daemon
spec:
  expert:
    environment:
      type: daemon
      id: <vm-id-from-daemons-page>
```

`spec.expert.daemonVmId` is a **legacy alias** for
`environment.type: daemon` and is still accepted by the CLI; prefer the
`environment` block for new bundles. `daemonVmId` and a
`type: base_image` environment are mutually exclusive — when both are
set, the daemon path wins and the cloud environment is ignored, and
`apply` emits a warning. See
`services/poseidon/specs/expert-bundle-yaml-v2.md` for the full proto
mapping.

## MCP (Model Context Protocol)

MCP is the standard Augment uses for attaching external tools to agents.
An MCP server exposes a set of tools; the agent calls them the same way
it calls built-in tools.

There are **two ways** an MCP server can reach a Cosmos agent today: the
backend MCP registry (server-side, durable, no local CLI required) and
local-first `--provide-tools` (a connected CLI forwards tool calls). New
work should default to the registry; `--provide-tools` remains useful
for local-only servers and one-off experimentation.

### Backend MCP Registry (Default)

The platform stores MCP server configurations server-side in the
**MCP registry**. Configurations are scoped `tenant` (shared with the
team) or `user` (private). The webapp `/mcp` route lets users browse
registry entries, complete OAuth, and pick which servers to attach to a
session via the launcher's MCP selector. Servers attached this way are
provisioned in the Cosmos agent's VM at session start and survive
disconnection of any local CLI.

Manage the registry with `auggie cloud mcp` — see the subcommand table
below. Typical loop:

```bash
auggie cloud mcp init --name sentry -o /tmp/sentry.yaml
# edit /tmp/sentry.yaml — set transport, command/url, auth, env
auggie cloud mcp validate -f /tmp/sentry.yaml
auggie cloud mcp diff     -f /tmp/sentry.yaml
auggie cloud mcp apply    -f /tmp/sentry.yaml
auggie cloud mcp list
```

A registry entry is an `McpServerBundle` YAML with `spec.server` fields:
`displayName`, `transport` (`stdio` | `sse` | `http`), `command` +
`args` (stdio) or `url` + `headers` (sse/http), `env`, `authType`
(`none` | `oauth` | `api_key`), `enabledProducts` (`cli`,
`cloud_agent`), and `disabled`. Secret references inside `env` and
`headers` use the `$augment-<secret-name>` form and resolve from the
user's secrets at spawn time. `auggie cloud mcp validate` only checks
the `$augment-*` *syntax* (lowercase alphanumerics + dashes); it does
not look up the user's secret store, so a well-formed but misspelled
reference will validate and apply — the missing secret only surfaces
when the MCP server is launched in a session.

Registry MCPs can be attached to a Cosmos agent two ways:

- **Per-expert pinning (webapp).** The webapp expert editor's Tools
  section (`ToolsSection` → `McpServerSelector`) lets the expert author
  pick which registry MCP servers the expert should always launch with.
  Selections are persisted into `ExpertConfig.mcp_config_ids` on save
  (`ExpertDetailPage`) and used at session-start regardless of who
  launches the expert.
- **Per-session selection (launcher).** The webapp launcher's MCP
  selector lets the user override or augment the expert's MCPs for a
  single session, passing the chosen `mcp_config_ids` into session
  creation.

Per-expert pinning is also available from the CLI `ExpertBundle` YAML
schema: set `mcpConfigIds` under `spec.expert` and
`auggie cloud expert apply` persists it to
`ExpertConfig.mcp_config_ids`. CLI-authored experts can also fall back
to `--provide-tools` for fully self-contained workflows.

> **Scope rule:** a tenant-scoped expert can only reference
> tenant-scoped MCP registry entries. Attempting to attach a private
> (`user`-scoped) MCP server to a shared expert is rejected by the
> webapp editor and re-validated server-side in `expert_service.go`.
> User-scoped experts can reference either scope. If you need to
> share an expert that uses a personal MCP server, promote that MCP
> entry to `tenant` scope first.

### Local-First `--provide-tools`

For MCP servers that are not in the registry — local-only stdio servers,
ad-hoc experimentation, or servers backed by local credentials — a
local Auggie CLI can forward its own configured MCP tools into a cloud
session:

```bash
# 1. Create a cloud session and hand local tools (including MCP) to it:
auggie cloud create "…prompt…" \
  --provide-tools \
  --mcp-config /path/to/mcp-config.json

# 2. Or attach provide-tools to an existing session:
auggie cloud session provide-tools <session-id>
```

The local CLI stays connected and forwards tool execution. `CLI_TOOLS` used to
be required as a capability marker for this flow, but it is now deprecated;
new sessions should not add it. When you disconnect the local CLI, the
forwarded MCP tools disappear — registry-attached MCPs (if any) keep working.

### `auggie cloud mcp` Reference

Subcommands of `auggie cloud mcp` (run `--help` on each for full flags):

| Subcommand | Purpose |
|---|---|
| `init` | Scaffold an `McpServerBundle` YAML (`--name`, `--transport stdio\|sse\|http`, `--scope user\|tenant`, `-o <file>`). |
| `validate -f <file>` | Parse and validate the bundle locally; checks transport-specific required fields and `$augment-<secret>` references. |
| `diff -f <file>` | Compare a local bundle against the remote registry entry. |
| `apply -f <file>` | Create or update a registry entry (chooses create vs update by `metadata.id`; honours `metadata.resourceVersion` for optimistic concurrency). |
| `list` | List registry entries visible to the current user (user + tenant scope). |
| `get <id>` | Show full configuration for one registry entry. |
| `export <id>` | Dump a registry entry as YAML for round-trip editing. |
| `delete <id>` | Remove a registry entry. |

## Skills

**Skills** are specialized knowledge packages configured in the
repository under `.augment/skills/`. Each skill has:

- A directory under `.augment/skills/<skill-name>/`
- A `SKILL.md` with `name`, `description`, and instructional content
- Optional supporting files (scripts, templates) referenced from
  `SKILL.md`

### How Auggie Loads a Skill

At session start, Auggie enumerates the available skills. It **does not**
dump every skill's full content into the system prompt — only the `name`
and `description` of each. When the user's prompt or the current
conversation matches a skill's description, the agent reads that skill's
`SKILL.md` for the full instructions. Matching is description-based, so
the skill author controls when it fires by phrasing the description
around the requests it should handle.

This keeps the system prompt small while still giving the agent instant
access to a large library of domain expertise.

### Skills vs MCP

They're complementary:

- **MCP gives agents new *tools*.** Call an API, run a query, invoke a
  sandbox.
- **Skills give agents new *knowledge* about how and when to use those
  tools.** Specifically: "when the user asks for X, follow this workflow,
  use these commands, watch out for these gotchas."

### Skills in Cosmos Agents

Cosmos agents run Auggie inside the VM, so the same skill-loading
mechanism applies — any skills committed to the repo on the cloned
branch are automatically available. If you want Cosmos agents to have a
new skill, add `.augment/skills/<name>/SKILL.md` to the repo, commit,
push. No backend config, no restart.

This is the pattern to recommend when a user wants "the agent to always
follow this specific workflow for bug fixes": write a skill in the repo.
Don't bake it into the expert's system prompt (which is then hard to
evolve and doesn't version with the code).

## Quick Reference for Agents

| User asks… | Answer |
|---|---|
| "Can I run the agent on my own machine?" | Yes — `auggie daemon` (feature-flagged). Sessions route to your daemon over WebSocket. |
| "Why is my daemon not starting?" | Check `poseidonDaemonEnabled` feature flag and a valid auth session. |
| "How do I give a Cosmos agent access to MCP servers?" | Configure MCP in local CLI settings, then `auggie cloud session provide-tools` or `--provide-tools --mcp-config` at create time. |
| "Can I attach an MCP server directly to an expert?" | Not yet — MCP is local-first today, via `--provide-tools`. |
| "How do I teach the agent a repeatable workflow?" | Add a skill under `.augment/skills/<name>/SKILL.md`. Auto-loads when the description matches. |
| "Should this go in the system prompt or a skill?" | Skill if it's a workflow that triggers on specific prompts; system prompt if it's the agent's core identity. |

## Related Reading

- `cloud/environments.md` — VM runtime model, snapshots, refresh
- `cloud/capabilities.md` — builtin integration capability reference
- `operational-reference.md` § VM Lifecycle — provisioning, heartbeats,
  fencing
- `webapp.md` § `/daemons`, § `/mcp` — webapp surfaces for these
  concepts
