# Experts

An **expert** is a template for creating Cosmos agent sessions. Each
expert is a server-side resource identified by a UUID. To see the
experts **actually deployed** in the current environment, run:

```
auggie cloud expert list          # summary
auggie cloud expert get <id>      # full details for one expert
```

> **Deployed experts vs. expert templates:** the `expert-templates/`
> directory in the knowledgebase contains **starter examples** for
> reference when writing new experts. They are not necessarily what is
> deployed. Always use `auggie cloud expert list` to answer questions
> about a user's experts.

The CLI manages experts through `ExpertBundle` YAML files. The
`spec.expert` block defines:

- **`displayName` / `description`** — human-readable identity
- **`placeholderText`** — optional home-page chat composer placeholder when this
  expert is selected; omit or leave empty to use the product default
- **`systemPrompt`** — top-level field that controls agent behavior
- **`model`** — top-level model identifier (e.g., the model-family key `claude-opus-4-8`, the form used by the expert templates). Run `auggie model list` to see the models available to your tenant; the bundle accepts either that family key or the short key shown in brackets (`opus4.8`).
- **`includeDefaultSystemPrompt`** — when `true`, the platform's default agent
  prompt is kept in addition to your custom `systemPrompt`
- **`autoCleanupOnIdle`** — optional expert-level auto-archive default. When
  `true`, sessions launched from this expert are automatically archived after
  their VM goes idle. Omit it or set `false` for the normal persistent-session
  behavior. `auggie cloud expert export` only emits this field when it is
  `true` to keep default YAML clean. Per-trigger `autoCleanupOnIdle` values in
  `spec.triggers[]` override the expert default for trigger-created sessions.
  **⚠️ Known issue:** per-trigger overrides are accepted by `expert apply` but
  not returned by `expert export` or `trigger list --json` — see
  `automations.md` § `autoCleanupOnIdle` for details.
- **`capabilities`** — list of capability name strings (see [Capabilities](capabilities.md))
- **`environment`** — `{ id, resources? }` selecting the VM runtime; `id` is an
  environment ID from `auggie cloud environment list`
- **`initialMessages`** — sent to the agent on session start
- **`workerExpertIds`** — which specific experts can be launched as sub-agents (mutually exclusive with `useAllExpertsAsWorkers`)
- **`useAllExpertsAsWorkers`** — when `true`, the agent can launch **any** discoverable expert as a worker. The agent discovers experts at runtime via `auggie cloud expert list --json` and passes the `expert_id` to `worker-launch`. Mutually exclusive with `workerExpertIds`.
- **`userInstructions`** — Markdown shown to humans launching the expert
- **`visibility`** — `tenant` (shared with team) or `user` (private to creator)
- **`hidden`** — when `true`, the expert is omitted from launcher surfaces
  (the webapp `/home` Expert grid). It remains fully usable: invocable by ID
  or deep link, launchable as a worker via `worker-launch`, and triggerable
  by webhooks/cron. Use this for worker-only or auto-triggered experts that
  should not clutter the human launcher (e.g. PR Author Status Watcher, PR Risk
  Analyzer, Code Review Memory Manager).
  Optional; omitted/`false` means visible. Only emitted in `expert export`
  YAML when set to `true`.
- **`space`** — optional single tenant-scoped space **name** the expert
  belongs to (dev/staging-only). Every expert (and environment) belongs to
  at most one space — used to keep team- or workstream-oriented experts
  together on the home launcher. A referenced space must already exist
  (via `auggie cloud space create` or the webapp's sidebar **Space
  picker** in the top-left) or `expert apply` aborts with a clean error
  pointing at the create command. `expert export` emits the current
  space's normalized name. Names are matched case-insensitively after
  trimming. Set `space: ""` (empty string) to clear an existing
  assignment; omit the field entirely to leave the current assignment
  untouched on apply.

## Managing Experts (CLI)

Run `auggie cloud expert --help` for the full command list. Key commands:
- `auggie cloud expert list` — list all deployed experts (add `--json` for machine-readable output)
- `auggie cloud expert get <id>` — show full details for one expert
- `auggie cloud expert init` — scaffold a new expert bundle YAML
- `auggie cloud expert apply -f bundle.yaml` — create or update. Add `--dry-run` to preview without writing; add `--prune` to delete remote triggers attached to the expert that are absent from `spec.triggers` (combine with `--dry-run` to preview the prune set first). Trigger reconciliation matches by workflow ID first (set as optional `spec.triggers[].id` in hand-written bundles, or auto-emitted by `expert export`), falling back to display name. Mutable fields (`name`, `enabled`) are reconciled in place on matched triggers; **event-source fields are immutable** — changing `type`, `eventType`, `webhookId`, etc. is rejected with a recreate-required error. Missing **bundle-managed** workflows are pruned by default; missing **unmanaged** workflows (e.g. UI-created) are only warned about and require `--prune` to delete.
- `auggie cloud expert export <id> -o bundle.yaml` — export an existing expert
- `auggie cloud expert validate -f bundle.yaml` — parse and validate without applying (also lints `<include>` directives in `systemPrompt`; see [Writing Expert Prompts → Composable skills](writing-expert-prompts.md#15-composable-skills-via-include-directives))
- `auggie cloud expert diff -f bundle.yaml` — compare local bundle against the remote version
- `auggie cloud expert versions <id>` — list version history
- `auggie cloud expert restore <id>` — restore a soft-deleted expert

## Managing Spaces (CLI and webapp)

> Availability: This feature is available only in dev/staging. It is not available in production.

Spaces are tenant-scoped: every expert (and environment) belongs to at
most one space. Spaces show up as a
single-select filter on the home launcher and as the canonical
"current space" selector in the webapp sidebar (top-left).
The CLI exposes:

- `auggie cloud space list` — list all spaces in the tenant (add `--json`
  for machine-readable output)
- `auggie cloud space create <name>` — create a space; fails with
  `AlreadyExists` when a space with the same normalized name already
  exists. Restricted to tenant admins.
- `auggie cloud space delete <name-or-id> [--yes]` — delete a space.
  Cascades to clear `SpaceID` on every expert and environment that
  referenced it; the resources themselves are not deleted. Idempotent:
  deleting a missing ID succeeds. Restricted to tenant admins.

In the webapp, the sidebar **Space picker** (top-left) is the canonical
surface: it lets users switch the current space, create a new space
inline by typing a name and pressing Enter, and bind the selection
across the home-page filter and the expert / environment forms. The
selection is persisted in `localStorage` so it survives reloads. When a
space is selected in the sidebar, the **Create expert** and **Create
environment** flows default the new resource into that space — users
can still override the picker on the form.

## Launching Experts: Three Modes

Sessions are created from experts in three distinct ways. Knowing which
mode a user wants changes which surface they should use.

| Mode | What It Is | When to Use |
|---|---|---|
| **Quick Start** | No expert — just a first message. The user gets a default cloud session with whatever they pick manually. | Exploration, one-off tasks, trying out the platform |
| **From Expert** | Launch from a saved expert. Model, environment, capabilities, worker experts, and initial messages all come from the expert bundle. | Repeatable workflows — the whole point of having experts |
| **Expert + Override** | From Expert, but with explicit overrides for model, environment, capabilities, or visibility at launch time. The expert bundle is unchanged. | Same workflow, different repo or machine size; one-off parameter tweaks without editing the expert |

The webapp `/home` page exposes all three. Clicking an expert card
opens a launcher with selectors (model, environment, capabilities,
visibility) pre-filled from the expert's config — leaving them alone is
**From Expert**, changing one of them is **Expert + Override**. Submit
with just a message and no expert selected to get **Quick Start**.

Two other paths both use From Expert exclusively:

- **Triggers** (declared in a bundle under `spec.triggers`) create a
  new session from the parent expert whenever a matching event arrives.
- **`worker-launch`** from a manager agent creates a sub-session from
  one of the experts listed in the manager's `workerExpertIds` (or any
  expert, when `useAllExpertsAsWorkers: true`).

Neither of these supports overrides — if you need a tweaked variant,
apply it as a second expert and reference the new ID.

### Deep Links

```
<base>/app/home?expertId=<id>&message=<url-encoded-text>
```

Opens the home page with the expert's start sheet expanded and the
message pre-filled. Both params are optional. `<base>` = scheme + host
from `session_url` in `augment-cloud/session-metadata.md`.

**Agent hand-off.** Agents without `worker-launch` can hand a task to a
cloud expert by composing a `/home` deep link and presenting it to the
user. Look up the expert ID with `auggie cloud expert list`, URL-encode
the task into `message`, and emit the link.

Unlike `worker-launch`, the resulting session is an **independent,
user-owned top-level session** — there is no parent/child link, the
originating agent cannot steer it after launch, and termination of the
originator does not cascade. Contrast:

|  | `worker-launch` | Deep link |
|---|---|---|
| Who can initiate | Manager agents with the target in `workerExpertIds` (or `useAllExpertsAsWorkers: true`) | Any agent (emits a URL) |
| Session ownership | Child of the manager session | Independent top-level session owned by the clicking user |
| Control post-launch | `worker-send-message`, `worker-terminate` | None — fire and forget |
| Parameter overrides | None | None |
| Requires human click | No | Yes |
| Good for | Tight orchestration, structured sub-tasks | One-shot hand-off when you aren't a manager |

## Versioning

Every `auggie cloud expert apply` creates a new **immutable version**.
The platform retains the full version history, so changes can always be
reviewed and rolled back.

- **List history:** `auggie cloud expert versions <id>` (most recent first)
- **Compare before applying:** `auggie cloud expert diff -f bundle.yaml`
- **Optimistic concurrency:** `metadata.resourceVersion` in the bundle
  prevents overwriting someone else's changes — re-export before apply if
  the expert may have been modified since you last fetched it. Omit it on
  first create.
- **Soft delete / restore:** `auggie cloud expert delete <id>` soft-deletes;
  `auggie cloud expert restore <id>` brings it back.

## Key Design Points

- `spec.expert.id` is server-assigned on create — omit it from the YAML for new
  experts; re-exports include it for round-tripping
- `systemPrompt`, `model`, `capabilities`, and `environment` are all top-level
  fields under `spec.expert` (the older nested `sessionConfig` / `vmConfig`
  shape has been removed)
