# Virtual File System (VFS)

A persistent filesystem shared across Cosmos agent sessions. Every agent gets
these scopes:

- **org/** — shared across all agents in the organization (team knowledge)
- **user/** — personal scratch space
- **space/** — shared across agents in the active Cosmos Space (dev/staging-only)

## How It Works

VFS appears as ordinary local directories under `$HOME/.augment/vfs/`:
- Cosmos agents: `/root/.augment/vfs/<agent-id>/` (the VM's `$HOME` is `/root`)
- Local auggie: `~/.augment/vfs/<agent-id>/`

The exact paths for the current session are injected into the agent's
system prompt via the `augment-cloud/vfs-paths.md` rule. There is no
`$AUGMENT_VFS_DIR` environment variable.

```
~/.augment/vfs/<agent-id>/
├── org/             ← shared organization filesystem
│   ├── docs/
│   ├── reports/
│   └── .sync-state
├── user/            ← personal scratch space
│   ├── notes/
│   └── .sync-state
└── space/           ← active Cosmos Space filesystem (dev/staging-only)
    └── .sync-state
```

Agents use standard file tools (`read_file`, `write_file`, `grep`, etc.) —
no special VFS tools needed. Syncing happens automatically at turn boundaries.

## What Goes in the VFS

- Research notes and summaries compiled across sessions
- Generated reports (weekly updates, code review summaries)
- Configuration and preferences referenced across tasks
- Scratch data and intermediate outputs from multi-step workflows
- Team knowledge bases built up over time

**The workspace repo is for code. The VFS is for everything else.**

### Not a Mechanism for Environment Variables or Secrets

VFS is a **file store**, not a shell-environment source. Writing `.env`,
`.bashrc`, or similar into a VFS directory does **not** export anything
into the agent's shell — nothing reads those files at login. For
environment variables and API keys, use the Secrets Manager
(`../secrets-and-access.md` § Setting Environment Variables in a Cloud
VM); every user secret is auto-injected as `$UPPER_SNAKE` at VM boot.

## Limits

- **1 MB** per file
- **10,000** files per filesystem
- **100 MB** total per filesystem

Oversized writes are rejected at sync-back; the tool-level check can be
bypassed by out-of-band writes (e.g., a script dropping a large file into the
VFS directory), and those will be rejected when the turn ends.

## Knowledge Accumulation Across Agents

The point of the VFS is to let agents **build on each other's work** without
needing a custom coordination API. One agent writes what it learned; the next
agent reads it and starts with more context.

Concrete example (PR Risk Analysis → Pair Reviewer):

1. The **PR Risk Analyzer** analyzes an incoming PR: risk category, related
   tickets, historical defect rate of the touched files. It writes a short
   note to `org/pr-reviews/<repo>/<pr-number>.md`.
2. A **Pair Reviewer** session is then launched (either by the risk analyzer, by a
   trigger, or by a human). It reads the same file and starts its review
   already knowing the risk context, so the human reviewer sees a richer
   first draft.
3. Neither agent needs to know the other exists — the VFS is the shared
   memory layer.

This pattern generalizes: any time you'd be tempted to pass state via
environment variables, custom RPCs, or message bodies, write it to the VFS
instead. It's persistent, versioned, organization-wide, and queryable with plain
`grep`/`find`/`jq`.

For expert teams that accumulate memory across sessions (code review,
incident response, etc.), use the standard **expert memory** layout —
`experts/<team>/breadcrumbs/` for notes and `experts/<team>/knowledge/`
for curated output — with the default memory prompt (append + probabilistic
compaction at 50 KiB) and handoff rules described in
[expert-memory.md](expert-memory.md).

## Cross-Agent State Pattern: Append-Only JSONL with Dedup

For state that grows over time across many agents (triage history, review
findings, incident timelines), the recommended shape is an **append-only
JSONL file**:

1. **One JSON record per line.** Agents append with plain `write_file` or
   shell redirection. No custom API.
2. **Stable key + dedup before append.** Before writing, grep the file for
   the stable key (e.g. `pr_url`, `ticket_id`, `incident_id`) and skip the
   write if it's already there. This makes the operation idempotent, which
   matters because triggers may fire the same event more than once.
3. **Date-based rotation near the 1 MB limit.** When a file approaches the
   limit, roll over to `<name>-YYYY-MM.jsonl`. Readers glob both.
4. **Readers use `grep` / `jq`.** There's no index — just plain text
   tooling. This keeps the contract between writers and readers trivially
   simple.

Example path layout:

```
org/
├── pr-triage/
│   └── triage-log.jsonl                 # { "pr_url": "...", "risk": "...", "agent_id": "...", "ts": "..." }
├── incident-timeline/
│   └── 2026-04.jsonl
└── release-notes/
    └── 2026-04.md
```

## VFS Version History

Every write automatically creates an **immutable version snapshot** — agents
don't need to opt in, and a buggy agent can't silently overwrite shared
state without leaving a trail.

```bash
auggie cloud vfs files                              # list all versioned files
auggie cloud vfs files --all                        # include deleted files
auggie cloud vfs history <path>                     # list versions of a file
auggie cloud vfs checkout <path> <timestamp> -o f   # restore a version
```

Use `--filesystem-id org` to access the shared organization filesystem.

## Manual VFS Sync from the CLI

Cosmos agents sync VFS directories automatically at turn boundaries. Humans can
run the same sync path manually from a local checkout:

```bash
auggie cloud vfs pull --filesystem-id user --dir ~/.augment/vfs/user
auggie cloud vfs push --filesystem-id user --dir ~/.augment/vfs/user
auggie cloud vfs sync --filesystem-id user --dir ~/.augment/vfs/user
auggie cloud vfs put ./notes.md notes/notes.md --filesystem-id user
```

Use `pull` for remote → local, `push` for local → remote, and `sync` for a
bidirectional sync. `put` is a single-file convenience command that uploads a
local file directly into the remote VFS without first copying it into a synced
directory.

**Attribution.** Each version row records the `modified_by` agent ID and the
write sequence number, so you can always see *which agent* wrote *what* and
*when*.

**Tombstones.** Deletions are versioned too. A delete writes a tombstone row
(`"deleted": true`) to the index and strips the content column. You can see
*what was deleted and by whom*, and incremental sync learns about the
deletion. There is no way to "quietly remove" a file from shared state.

**Retention (time-decay pruning).** A background cron prunes old versions
using a 6-tier schedule. Within each tier, the latest version in each bucket
is kept:

| Age window | Keep |
|---|---|
| Last 15 minutes | Every version |
| 15 min – 3 hours | 1 per 15-minute bucket |
| 3 hours – 24 hours | 1 per hour |
| 1 day – 7 days | 1 per 6 hours |
| 7 days – 30 days | 1 per day |
| Beyond 30 days | 1 per week |

This keeps recent work high-fidelity for quick undo while still providing
long-term audit coverage.

**No virtual `.versions/` directory.** Versions are accessed explicitly via
the CLI commands above (or the equivalent RPCs) — agents only see live files
when listing a VFS directory.

## .vfsignore

Add patterns to `.vfsignore` in a VFS directory to exclude files from syncing.
