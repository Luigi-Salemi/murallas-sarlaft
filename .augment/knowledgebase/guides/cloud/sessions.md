# Sessions

Sessions are running agent instances created from experts.

Run `auggie cloud session --help` for the full command list.

## Session Lifecycle

Every session moves through a six-state machine. Knowing the current state
is usually the first step when debugging "my agent isn't doing anything".

```
STARTING ──► PROCESSING ──► IDLE ──► COMPLETED
                 ↕              ↑          │
         WAITING_FOR_INPUT ─────┘          │
                 │                         │
                 ▼                         ▼
             TERMINATED ◄──────────────────┘
```

| State | Meaning |
|---|---|
| `STARTING` | Agent record exists, but the first live turn has not started processing. VM may still be provisioning, cloning the repo, or booting Auggie. |
| `PROCESSING` | Agent is actively executing work — reading code, calling tools, generating output. |
| `WAITING_FOR_INPUT` | Agent is blocked on a user response (ask-user) or a tool-approval decision. Nothing will advance until the human replies. |
| `IDLE` | Agent finished its current turn and is quiescent, ready for more work. A new message resumes it. |
| `COMPLETED` | Agent marked itself done for the current task. Not terminal — a later user message revives it into `PROCESSING`. |
| `TERMINATED` | Agent is no longer runnable. **Terminal.** No transition out. Delete and recreate if you need to continue. |

Allowed transitions (no-ops always allowed; invalid transitions are
rejected at the storage layer):

| From | Allowed To |
|---|---|
| `STARTING` | `PROCESSING`, `TERMINATED` |
| `PROCESSING` | `WAITING_FOR_INPUT`, `IDLE`, `COMPLETED`, `TERMINATED` |
| `WAITING_FOR_INPUT` | `PROCESSING`, `TERMINATED` |
| `IDLE` | `PROCESSING`, `COMPLETED`, `TERMINATED` |
| `COMPLETED` | `PROCESSING`, `TERMINATED` |
| `TERMINATED` | _none_ |

### Self-Termination

An agent can end its own session from inside its conversation. Which tool is
available — and what "ending" actually does — depends on whether the agent is a
**worker** (launched by another agent via `worker-launch`) or a **non-worker
session** (launched by a user, trigger, or API call):

| Agent kind | Self-terminate tool | What it does |
|---|---|---|
| Non-worker session | `terminate-session` | Archives the session (sets `archived=true`), drops its event subscriptions, and lets its VMs idle-stop. Returns `{"terminated": true}`. Does **not** transition the session to `TERMINATED` — sending a new message unarchives and resumes it, same as any other archived session. |
| Worker | `worker-report-to-manager` with `terminate=true` | Reports a final result to the manager and then ends the worker in one step. Terminal for the worker. See [Workers](workers.md). |

The two tools are **mutually exclusive** — workers never see `terminate-session`,
and non-worker sessions never see `worker-report-to-manager`. This guarantees
every agent has exactly one self-stop path, so prompts don't have to branch on
agent kind, and every worker always delivers a final report before exiting.

## Archived Flag

`archived` is an **orthogonal boolean**, not a lifecycle state. Any
non-processing session can be archived to hide it from default views.
Archived sessions are still fully intact on the backend; sending them a
new message unarchives and resumes them.

Idle sessions are **auto-archived** after a long quiet period to keep
dashboards clean. This is purely a visibility change; no data is lost.

## Session Visibility and Sharing

Sessions are scoped by a `visibility` enum with two meaningful values:

- `SESSION_VISIBILITY_SHARED` — visible to everyone in the tenant.
- `SESSION_VISIBILITY_PRIVATE` — visible only to the creator.

The default depends on **how the session was created**:

| Source | Default visibility |
|---|---|
| Launched from a **tenant-scoped expert** | `SHARED` |
| Launched from a **user-scoped expert** | `PRIVATE` |
| Created by a **trigger / bot** (e.g., from a PR webhook) | `SHARED` — so any teammate can interact with it |

Owners can explicitly grant viewer access to specific teammates via the
webapp Share button (OLAC-backed), backed by the `ShareSession` /
`UnshareSession` / `ListSessionAccess` RPCs. A dedicated
`auggie cloud session share` CLI command is not yet wired — the RPC exists
but must currently be invoked via the webapp or directly via gRPC.

> Per-recipient sharing for **experts** is also shipped — the expert
> page has a **Share expert** button (owners only) backed by the
> generic OLAC `grantObjectRole` / `revokeObjectRole` RPCs. There is
> no dedicated `ShareExpert` RPC and no `auggie cloud expert share`
> CLI yet. Per-object **MCP** sharing is still coarse-grained
> (`user` vs `tenant`); see
> [`secrets-and-access.md` § Experts and MCP Access Control](../secrets-and-access.md#experts-and-mcp-access-control).

## Session Metadata Rule

Every Cosmos agent session has a built-in always-attached rule at virtual path
`augment-cloud/session-metadata.md` that the platform populates per connection
from the JWT claims and Settings service. The rule is plain `key: value`
lines:

```
github_username: alice
session_url: https://app.augmentcode.com/app/session?agentId=01ABC...
space_id: 3f5d2f4f-5cf3-4a59-bd8e-4c0d2ff2f7e9
space_name: Engineering
user_email: alice@example.com
```

Reference these from your expert's `systemPrompt` when constructing GitHub
comment headers, attribution lines, sticky-comment markers, or any other text
that needs the human's identity. Typical placeholders:

- `{{session_url}}` — used in comment headers for self-detection
- `{{github_username}}` — used for `@mention` attribution
- `{{space_id}}` / `{{space_name}}` — the current Cosmos space context. When the session is not bound to a specific space, `space_id` is omitted and `space_name` is the literal string `Default`.
- `{{user_email}}` — occasionally used for commit author fields

Template syntax (`{{ }}`) is not platform-interpreted — agents just do
string replacement themselves after reading the rule file at session start.

- The values are resolved per `ConnectCliVm` call, not from the expert
  bundle — so the same expert produces a different `session-metadata.md`
  for each user who runs it.

## Listing Sessions From the CLI

`auggie cloud session list` lists Cosmos agent sessions. By default it only
shows sessions **you** own; OLAC-shared sessions created by other users are
hidden unless explicitly included.

| Option | Description |
|---|---|
| `--include-shared` | Also include OLAC-shared sessions visible to you. Legacy tenant-shared sessions are not included. Default: only your own sessions. |
| `--limit <n>` | Cap the number of sessions returned (default `100`, max `500`). |

```bash
auggie cloud session list                       # your sessions only
auggie cloud session list --include-shared      # plus shared sessions
auggie cloud session list --limit 5
```

## Creating Sessions From the CLI

`auggie cloud session create` launches a new Cosmos agent from an existing
expert. The interesting flag for automation is `--message`:

| Option | Description |
|---|---|
| `--expert <id>` | **Required.** Expert ID to launch from. |
| `--name <name>` | Optional display name for the new session. |
| `--message <text>` | Optional initial user message — seeded as the first user turn at creation time, no extra round-trip needed. Maps to `CreateAgentFromExpertRequest.initial_message` (proto field 6). When omitted, the session starts empty and waits for the next message. |

```bash
auggie cloud session create \
  --expert <expert-id> \
  --name "AU-1234: fix login bug" \
  --message "Investigate AU-1234. Repo: …, repro: …, owner: @alice."
```

This is the path other Cosmos experts use when they programmatically launch
sub-sessions (e.g., a triage expert dispatching one builder session per
ticket) — the brief lands as the first user turn so the launched agent
can start working immediately.

## Syncing Sessions Locally

`auggie cloud session sync` downloads Cosmos agent sessions from the Cosmos
backend into `~/.augment/sessions/` as JSON files. This is useful for:

- Inspecting another agent's conversation history from your own session
- Reviewing how a past session went (planning, implementation, review)
- Offline analysis of session data

### Usage

```
auggie cloud session sync [options]
```

| Option | Description |
|---|---|
| `--since <date>` | Only sync sessions created after this date (e.g. `2026-01-01`) |
| `--until <date>` | Only sync sessions created before this date |
| `--expert <id-or-name>` | Only sync sessions from this expert (ID or name substring) |
| `--agent-id <id...>` | Sync specific agent(s) by ID (repeatable) |
| `--force` | Re-sync even if the local session file already exists |
| `--dry-run` | Show what would be synced without writing anything |
| `--include-archived` | Include archived sessions (excluded by default) |

### Examples

```bash
# Sync a single session by agent ID
auggie cloud session sync --agent-id 01KP6SCTESA1K67XY3TH4KK8HD

# Re-sync (overwrite) an already-downloaded session
auggie cloud session sync --agent-id 01KP6SCTESA1K67XY3TH4KK8HD --force

# Sync all sessions from the last week
auggie cloud session sync --since 2026-04-07

# Sync sessions from a specific expert
auggie cloud session sync --expert "PR Review"

# Preview what would be synced
auggie cloud session sync --since 2026-04-01 --dry-run
```

### Reading Synced Sessions

Synced sessions are saved as JSON files under `~/.augment/sessions/`. Each
file contains a `chatHistory` array where each entry has an `exchange` object
with `request_message` (user turn) and `response_text` (agent turn). You can
parse these with standard tools (`python3 -c`, `jq`, etc.) to summarize or
search conversation history.

### Notes

- Requires authentication — run `auggie login` first if not already logged in.
- The `--expert` flag accepts either a raw expert ID (ULID/UUID) or a name
  substring; if the substring matches multiple experts, the first match is used.
- Sessions that already exist locally are skipped unless `--force` is passed.
- The exit code is 0 if at least one session synced successfully, 1 only if
  all attempted syncs failed.

### Session ID Encodings (ULID vs UUID)

Cloud session IDs surface in two equivalent encodings of the same 128
bits:

- **ULID** (Crockford base32, 26 chars, e.g.
  `01KQZY24804QAV0ZH2HZHHADPJ`) — used in webapp URLs
  (`/app/session?agentId=…`), `auggie cloud session list` output, and the
  `--agent-id` flag of `session sync`.
- **UUID** (dashed hex, e.g. `019dffe1-1100-25d5-b07e-228fe31536d2`) —
  used as the on-disk filename under `~/.augment/sessions/<UUID>.json`
  after `auggie cloud session sync`.

The two forms are losslessly interconvertible with no API call: decode
the 26-char ULID as Crockford base32 (alphabet
`0123456789ABCDEFGHJKMNPQRSTVWXYZ`) into a 128-bit integer, format as
32 hex chars, and dash as `8-4-4-4-12`. A small Python snippet:

```python
ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
n = 0
for c in "01KQZY24804QAV0ZH2HZHHADPJ":
    n = n * 32 + ALPHA.index(c)
hex_str = f"{n:032x}"
uuid = f"{hex_str[0:8]}-{hex_str[8:12]}-{hex_str[12:16]}-{hex_str[16:20]}-{hex_str[20:32]}"
# 019dffe1-1100-25d5-b07e-228fe31536d2
```

**Heads-up for agents using the IDE `view-session` tool:** that tool
currently looks up sessions by ULID-named file (`<ULID>.json`), but
`auggie cloud session sync` writes them as UUID-named files
(`<UUID>.json`). Even right after a successful sync, calling
`view-session 01K…` may return "could not be fetched". Workarounds:

- Convert the ULID to its UUID form first and pass that to
  `view-session`.
- Or skip `view-session` entirely and read the synced JSON directly
  (e.g. `python3 -c "import json; …"` over
  `~/.augment/sessions/<UUID>.json`).

## Knowledgebase

This knowledgebase is synced to `~/.augment/knowledgebase/` at agent session
start. Agents can browse it with standard file tools.

Run `auggie cloud kb --help` for the full command list.

| Command | Purpose |
|---|---|
| `auggie cloud kb sync [--force]` | Re-sync the knowledgebase to `~/.augment/knowledgebase/`. Use `--force` to re-download even when the local copy looks up to date. |
| `auggie cloud kb path` | Print the local knowledgebase directory (useful for scripts or when piping to `grep -ri`). |

The Cosmos agent session runner also syncs on session start, best-effort —
`auggie cloud kb sync` is the manual escape hatch when the on-session sync
failed or the local copy is stale.
