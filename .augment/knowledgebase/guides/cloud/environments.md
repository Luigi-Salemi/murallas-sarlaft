# Environments

Environments define the reusable runtime surface for Cosmos agents: base
image, repo layout, environment variables, snapshot/build history, and
visibility. An expert points at an environment by
`spec.expert.environment.id`; many experts can reuse the same environment.

## Environment Mental Model

| Concept | What it is |
|---|---|
| **Environment** | A reusable runtime template/config: base image, repos, env vars, scripts, visibility. Stored server-side. Many experts can share one. |
| **Session VM** | A concrete VM launched from an environment. Each session gets its own VM instance. |
| **Snapshot / Restore** | When a VM stops, its filesystem is snapshotted. On restart the same session resumes from the snapshot — all local state preserved. |
| **Refresh** | Rebuild the environment's base snapshot from the (possibly updated) base image. New sessions get the refreshed image; existing snapshots are discarded. |
| **Rebuild** | Re-build the environment image with explicit overrides (custom scripts, different base image ref). Like refresh but with config changes. |

Key distinction: **snapshot/restore** preserves a single session's local
state across stop/start. **Refresh** and **rebuild** produce a new
environment-wide base image — they do not preserve per-session state.

## Spaces (optional grouping) (dev/staging-only)

An environment can belong to at most one **space** — a tenant-scoped
grouping shared with experts. Spaces are managed
from the CLI (`auggie cloud space list|create|delete`) and from the
webapp's sidebar **Space picker** in the top-left (see
`guides/cloud/experts.md` § Managing Spaces for the full model).

- **`spec.environment.space`** — optional **display name** of the
  space. Names — not IDs — are persisted so YAML is portable across
  tenants. The referenced space must already exist; `environment
  apply` aborts with a clean error otherwise (no auto-create).
  `environment export` emits the current space's name. Set
  `space: ""` to clear an existing assignment; omit the field
  entirely to leave the current assignment untouched on apply.
- **Webapp default behavior**: when a space is selected in the
  sidebar picker, the **Create environment** flow seeds the form's
  space to that selection. Users can override on the form.
- **Delete cascade**: deleting a space clears `space_id` on every
  environment that referenced it; environments themselves are not
  deleted.

## CLI Command Reference

Run `auggie cloud environment --help` for the full list. All subcommands:

| Command | Purpose |
|---|---|
| `list` | List all environments visible to you; this subcommand does **not** currently support `--json` |
| `get <id>` | Show full details of one environment (base image, repos, env vars, visibility, etc.) |
| `delete [--force] <id>` | Delete an environment (prompts for confirmation unless `--force`) |
| `duplicate [--name <n>] [--visibility <v>] <id>` | Copy an existing environment with optional name/visibility override |
| `refresh <id>` | Refresh the environment — rebuild from the current base image |
| `init [--name <n>] [-o <file>]` | Scaffold a new environment bundle YAML template |
| `export [-o <file>] [--force] [--resource-version <n>] <id>` | Export an environment's config to a local bundle YAML (round-trip); optionally export a specific historical version |
| `validate -f <file>` | Validate a local environment bundle file |
| `diff -f <file>` | Compare a local bundle against the remote environment |
| `apply -f <file> [--dry-run]` | Create or update an environment from a local bundle |
| `rebuild [--provision-script <s>] [--vm-startup-script <s>] [--base-image-ref <ref>] [--use-default-scripts] <id>` | Rebuild the environment image with explicit overrides |
| `versions [--json] [--limit <n>] <id>` | List config version history for the environment |
| `builds <id>` | List build/image history for the environment |
| `restore <id>` | Restore a soft-deleted environment |
| `set-default [--scope <personal\|team>] <target-id>` | Set the default environment target used when an expert/launch does not specify one. The target can be an environment, live daemon, or daemon pool; `daemon:<id>` and `pool:<id>` prefixes force a specific target type. `--scope personal` (default) sets the per-user default; `--scope team` sets the tenant-wide default and requires a team-visible catalog target. |
| `unset-default [--scope <personal\|team>]` | Clear the default environment for the given scope. |
| `get-default [--scope <personal\|team>] [--json]` | Show the current default environment for the given scope. |

## Common Workflows

**Create from scratch:**
```
auggie cloud environment init --name my-env -o /tmp/env.yaml
# edit /tmp/env.yaml
auggie cloud environment validate -f /tmp/env.yaml
auggie cloud environment diff -f /tmp/env.yaml
auggie cloud environment apply -f /tmp/env.yaml
```

**Make a variant of an existing environment:**
```
auggie cloud environment duplicate <source-id> --name "my-variant"
```

**Inspect a deployed environment:**
```
auggie cloud environment get <id>
```

**See config version history:**
```
auggie cloud environment versions <id>
auggie cloud environment versions --json <id>   # machine-readable
```

**See build/image history:**
```
auggie cloud environment builds <id>
```

**Restore a soft-deleted environment:**
```
auggie cloud environment restore <id>
```

**Pick up base-image updates (refresh):**
```
auggie cloud environment refresh <id>
```

**Rebuild with custom scripts or a different base image:**
```
auggie cloud environment rebuild <id> --base-image-ref <ref>
auggie cloud environment rebuild <id> --provision-script ./setup.sh
auggie cloud environment rebuild <id> --use-default-scripts
```

**Export a specific historical version:**
```
auggie cloud environment export <id> --resource-version 3 -o /tmp/env-v3.yaml
```

**Export → edit → diff → apply (modify existing):**
```
auggie cloud environment export <id> -o /tmp/env.yaml
# edit /tmp/env.yaml
auggie cloud environment diff -f /tmp/env.yaml
auggie cloud environment apply -f /tmp/env.yaml
```

## What Persists and What Does Not

| Scenario | Repos / workspace | Installed packages / caches | Uncommitted changes | Environment config |
|---|---|---|---|---|
| **Stop / start** (snapshot restore) | ✅ preserved | ✅ preserved | ✅ preserved | unchanged |
| **Fresh session** (same environment) | re-cloned fresh | from base image | ❌ gone | unchanged |
| **Refresh** | re-cloned fresh | from updated base image | ❌ gone | unchanged |
| **Rebuild** | re-cloned fresh | from rebuilt image | ❌ gone | may change (new scripts/image) |

- Snapshot restore resumes a **specific session** — all local state intact.
- Refresh / rebuild produce a **new base image** for the environment — all
  future sessions (and resumed sessions) start from that new image.
- A resumed VM that was snapshotted before a refresh will still have its
  old snapshot. It does **not** automatically pick up the refreshed image.

## Base Image

Every environment starts from a **Docker image**. Two options:

- **Standard image** — the Augment-maintained base image (Ubuntu + Python +
  Node + common toolchain). Good default for most teams; picks up OS
  updates and tool updates automatically on refresh.
- **Custom image** — your own image, typically derived from the standard
  base, with extra SDKs, internal CLIs, build dependencies, private
  package-manager credentials baked in. Use this when the standard image
  can't build your code or agents need tools that aren't publicly
  available.

To inspect the live configured base image for a specific environment:
```
auggie cloud environment get <id>
```
This is a runtime-state question — the answer comes from the CLI, not docs.

The bundle field is `spec.environment.baseImage` (a string — a Docker
image reference such as `nikolaik/python-nodejs:python3.12-nodejs22-bookworm`,
which is the platform default when the field is omitted). For a custom
image, push it to a registry the platform can pull from and set
`baseImage: <registry>/<image>:<tag>`.

### Known-good public base images

When creating environments from YAML or the web app, prefer one of these
public images before inventing a custom base image. They are intended to be
pullable by Modal without registry credentials and include `git`, `bash`, and
`node` by default:

| Use case | Image |
|---|---|
| Default Python + Node | `nikolaik/python-nodejs:python3.12-nodejs22-bookworm` |
| TypeScript + Node devcontainer | `mcr.microsoft.com/devcontainers/typescript-node:4.0.8-22-bookworm` |
| Python 3.12 + Node | `cimg/python:3.12.13-node` |
| Go 1.24 + Node | `cimg/go:1.24.13-node` |
| PHP 8.4 + Node | `cimg/php:8.4.19-node` |
| Ruby 3.4 + Node | `cimg/ruby:3.4.9-node` |
| Rust 1.95 + Node | `cimg/rust:1.95.0-node` |

Tag policy for these curated choices:

- Never use `latest`.
- Prefer the most specific human-readable tag available: runtime patch, image
  series patch, OS codename, and required variants such as `-node`.
- Do not digest-pin curated defaults unless the user explicitly needs strict
  reproducibility; mutable tags let environment refreshes pick up upstream
  security and toolchain fixes.

To use one from the CLI, set `spec.environment.baseImage` in the environment
bundle, then run `auggie cloud environment apply -f <file>`. Use
`auggie cloud environment rebuild <id> --base-image-ref <image>` to force a
new image build from a chosen ref.

### Custom build scripts: `provision-script` vs `vm-startup-script`

`auggie cloud environment rebuild` accepts two script overrides:

| Flag | When it runs | Use for |
|---|---|---|
| `--provision-script <path>` | During **image rebuild**, before snapshot. Changes are baked into the environment's base snapshot and shared across all future sessions. | Installing SDKs, cloning vendor repos, warming build caches — anything expensive you don't want to re-run on every session. |
| `--vm-startup-script <path>` | During **every VM boot** from the snapshot. Runs per-session, not baked into the image. | Per-session setup that must run fresh each time (e.g., re-logging into a short-lived credential, starting a daemon, environment-variable-dependent setup). |

`--use-default-scripts` reverts both slots to the platform defaults. See
`auggie cloud environment rebuild --help` for full flag semantics.

## Repos

Environments can auto-clone one or more Git repos into the agent's
workspace on first boot. Repos are cloned with the user's/org's connected
GitHub credentials. The expert's `systemPrompt` can then reference paths
inside the cloned repo from the very first turn — no manual setup step.

To inspect the repos configured for a specific environment:
```
auggie cloud environment get <id>
```

## Environment Variables

Environments can define environment variables that are injected whenever a
VM starts from that environment. These are part of the environment bundle
surface and round-trip through `init` / `export` / `apply`.

The field is `spec.environment.environmentVariables`, an array of
`{ name, value }` entries:

```yaml
apiVersion: poseidon.augmentcode.com/v1alpha1
kind: EnvironmentBundle
metadata:
  name: my-env
spec:
  environment:
    displayName: My env
    visibility: user
    environmentVariables:
      - name: NODE_ENV
        value: production
      - name: MY_SERVICE_URL
        value: https://example.internal
```

These values are visible to every session launched from the environment,
baked into the environment config, and committed to version history.
Prefer this over per-user secrets when the value is **not** sensitive and
should be the same for everyone running the environment (API hostnames,
feature toggles, default paths).

For secrets (API keys, tokens, credentials) use the **Secrets Manager**
instead — see [`guides/secrets-and-access.md`](../secrets-and-access.md).
Each user's secrets are injected per-session as `$UPPER_SNAKE` env vars;
they are **not** baked into the environment bundle.

| Use for | Mechanism |
|---|---|
| Non-sensitive, environment-wide defaults (hostnames, flags, paths) | `spec.environment.environmentVariables` on the environment bundle |
| Per-user secrets (API keys, tokens, credentials) | Webapp `/secrets` page (sidebar **Configuration** → **Secrets**) or `auggie cloud secret set` (auto-injected as `$UPPER_SNAKE`) |

## Snapshot and Restore

When a VM is stopped (idle timeout, hard timeout, or explicit stop), its
filesystem is snapshotted. On restart, the agent resumes from the snapshot
with:

- Cloned repos intact (uncommitted changes preserved)
- Installed packages and build caches preserved
- VFS state picked back up from the backend at turn boundaries

This is what makes "come back tomorrow" workflows fast — no re-cloning, no
re-building, no re-downloading dependencies.

> Details of generation fencing (how stale VMs are prevented from
> receiving work after restart) live in `operational-reference.md`.

## Refresh

Environments are periodically **refreshed** — the VM is rebuilt from the
(possibly updated) base image to pick up OS patches, new tool versions, and
security updates. If `/opt/augment/refresh.sh` exists in the image, the
platform runs it during refresh so customers can layer their own refresh
logic (e.g., re-login to internal package registries, warm a build cache).

Refresh is non-destructive with respect to workspace code: Git repos are
re-cloned fresh (so local un-pushed changes are **not** preserved across a
refresh — treat refresh as "reboot with new OS"). Snapshot/restore is the
mechanism for preserving work-in-progress between normal sessions.

## Default Environments and Resolution Cascade

An expert's `spec.expert.environment.id` is **optional**. When it is
omitted (or when a launch does not pin one explicitly), the platform
resolves the environment from a fallback cascade rather than failing.

The cascade depends on who initiated the launch:

| Caller | Resolution order (first match wins) |
|---|---|
| **Home / CLI launch** (user-initiated) | per-launch override → expert-baked env → user default → team default → system default |
| **Trigger** (webhook, cron, subscription) | expert-baked env → user default → team default → system default |
| **Worker** (sub-agent via `worker-launch`) | sub-expert-baked env (if set) → parent agent's resolved env |

The **user default** and **team default** slots are managed with
`auggie cloud environment set-default / unset-default / get-default`:

```
# Set the per-user default (only affects launches by you)
auggie cloud environment set-default <target-id>

# Set the tenant-wide default (affects everyone in the org;
# requires a team-visible environment or daemon pool)
auggie cloud environment set-default --scope team <target-id>

# Personal defaults can point at live daemons or daemon pools as well
auggie cloud environment set-default daemon:<vm-id>
auggie cloud environment set-default pool:<pool-id>

# Inspect / clear
auggie cloud environment get-default            # personal scope
auggie cloud environment get-default --scope team
auggie cloud environment unset-default
auggie cloud environment unset-default --scope team
```

The target resolver checks environments first, then live daemons and daemon
pools (unless a `daemon:` or `pool:` prefix is supplied). The team-default
setter rejects live daemons because they are user-scoped, and it rejects
user-visible environments or daemon pools because a team-wide default must
be visible to everyone it applies to.

The webapp also surfaces the same defaults under the Configuration →
Environments area; CLI and webapp write to the same backing store.

## Visibility

Like experts, environments are scoped to `user` (private) or `tenant`
(team-wide). Tenant environments are the norm for production use so
multiple experts can share a single build/runtime surface.

## Runtime State vs Documentation

These questions are **runtime-state questions** — answer them with live CLI
commands, not from static docs:

| Question | Command |
|---|---|
| What environments do I have? | `auggie cloud environment list` |
| What base image / repos / env vars does environment X use? | `auggie cloud environment get <id>` |
| What changed over time? (config history) | `auggie cloud environment versions <id>` |
| What builds/images were produced? | `auggie cloud environment builds <id>` |
| What is the latest config version? | `auggie cloud environment versions <id>` |

## Troubleshooting

**Snapshot vs refresh vs rebuild:**
Snapshot/restore preserves a single session's state across stop/start.
Refresh and rebuild produce a new environment-wide base image. They are
independent operations.

**Version history vs build history:**
`versions` shows config version history (when the environment definition
changed). `builds` shows build/image history (when VMs were built). These
are separate timelines.

**Resumed VM does not reflect a refreshed environment:**
A VM that was snapshotted before a refresh will resume from its old
snapshot, not the new base image. To get the refreshed image, start a
new session instead of resuming the old one.

**Restoring a deleted environment:**
If an environment was soft-deleted, use `auggie cloud environment restore <id>`
to bring it back.
