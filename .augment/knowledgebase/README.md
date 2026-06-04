# Cosmos Knowledgebase

Reference documentation for Cosmos agents. This knowledgebase
is synced to `~/.augment/knowledgebase/` at session start.

## When to Consult This Knowledgebase

**Read the relevant page from the table below before answering or acting on
any task that touches Cosmos.** The knowledgebase is the source of
truth for Cosmos-agent concepts, expert configuration, and operational
patterns — your built-in knowledge will be incomplete or out of date.

### Experts

> **Important:** When a user asks "what experts do I have?" or "tell me
> about my experts", they mean the experts **deployed in their
> environment** — run `auggie cloud expert list` to see those. Do NOT
> answer from the expert templates in `expert-templates/`; those are
> starter examples that may or may not match what is actually deployed.

| If the user is asking about… | Read |
|---|---|
| "What experts do I have?", listing or inspecting deployed experts | Run `auggie cloud expert list` (or `auggie cloud expert get <id>`) — the knowledgebase cannot answer this; it's runtime state. |
| "Can an agent set this up itself?" — agents using the CLI to create experts, environments, triggers, sessions | `guides/cloud/self-service.md` |
| Configuring or writing an expert; system-prompt patterns; what makes a good expert prompt | `guides/cloud/experts.md` and `guides/cloud/writing-expert-prompts.md` |
| How a user launches a session from an expert (Quick Start / From Expert / Expert + Override); deep links | `guides/cloud/experts.md` § Launching Experts and `guides/webapp.md` § `/home` |
| "How do I launch another expert from an agent?" — `worker-launch` vs deep-link hand-off | `guides/cloud/workers.md` § Delegating to Another Expert |
| Deep-link URL construction (`/home?expertId=…&message=…`) | `guides/cloud/experts.md` § Deep Links |
| Looking at starter/example expert bundles for reference when writing a new expert | `expert-templates/README.md` and the matching `expert-templates/*.yaml.template` |
| Setting up the Feedback Triager (Slack) for a channel (one ticket per thread, edits/deletes/mentions handled in-session, no duplicate tickets) | `expert-templates/feedback-triager.yaml.template` |
| Setting up an Incident Investigator (Slack) for fixed alert channels and/or ad-hoc incident channels (triage → investigate via the runtime's metrics-query and log-query skills → post root-cause analysis → human-gated PR Author handoff → post-resolution summary / post-mortem suggestion) | `expert-templates/incident-investigator.yaml.template` |
| Setting up GitLab MR authoring or a GitLab-backed expert environment | `guides/cloud/gitlab-environment-setup.md`, `expert-templates/gitlab-cloud.yaml.template`, and `expert-templates/mr-author.yaml.template` |
| Hiding a worker-only or auto-triggered expert from the webapp Home launcher (`spec.expert.hidden: true`) | `guides/cloud/experts.md` § expert config and `expert-templates/README.md` § Hiding an expert from the Home launcher |

### Automations & workers

| If the user is asking about… | Read |
|---|---|
| Triggers, subscriptions, scheduled automations, event-driven agents, JSONLogic filters | `guides/cloud/automations.md` |
| Why multi-agent / orchestrator-worker at all; the focus & context-window argument | `guides/cloud/workers.md` § Why Multi-Agent? |
| Workers, orchestrators, multi-agent dispatch, the STOP-and-Wait cadence, `worker-*` tools | `guides/cloud/workers.md` |
| Worker availability modes: explicit `workerExpertIds` list vs `useAllExpertsAsWorkers` for dynamic discovery | `guides/cloud/workers.md` § How Workers Work |

### Core cloud concepts

| If the user is asking about… | Read |
|---|---|
| Capabilities (GitHub, Linear, Slack, web access, CLI tools, GitHub App vs OAuth) and integration setup boundaries | `guides/cloud/capabilities.md` |
| VFS — `~/.augment/vfs/`, organization vs user filesystems, sharing state across agents | `guides/cloud/vfs.md` |
| VFS knowledge accumulation, cross-agent append-only JSONL pattern, version history retention (6-tier), tombstones | `guides/cloud/vfs.md` |
| Expert memory system — `experts/<team>/breadcrumbs/` (structured Markdown with `Source:` + `Paths:`) vs `knowledge/` (Markdown), path/topic-scoped headings, deterministic source-weighted curation, probabilistic compaction, handoff rules | `guides/cloud/expert-memory.md` |
| Environments deep dive — base image, snapshot, refresh + `/opt/augment/refresh.sh`, repos, env vars | `guides/cloud/environments.md` |
| GitLab custom environment setup (`glab`, `gitlab-token`, `.netrc`, VM startup clone/fetch, custom webhooks) | `guides/cloud/gitlab-environment-setup.md` |
| "What environments do I have?", inspecting a specific environment's config | Run `auggie cloud environment list` / `get <id>` — runtime state, not in docs. See `guides/cloud/environments.md` § Runtime State vs Documentation |
| What base image, repos, or env vars does an environment use? | `auggie cloud environment get <id>` — see `guides/cloud/environments.md` § Base Image, § Repos |
| What changed in an environment over time? Config version history, build history | `auggie cloud environment versions <id>` / `builds <id>` — see `guides/cloud/environments.md` § CLI Command Reference |
| Difference between snapshot, refresh, and rebuild | `guides/cloud/environments.md` § Environment Mental Model, § What Persists and What Does Not, § Troubleshooting |
| Creating, duplicating, restoring, or modifying environments | `guides/cloud/environments.md` § Common Workflows |
| Default environment when an expert/launch does not specify one — per-user vs tenant-wide defaults, the `set-default` / `unset-default` / `get-default` CLI subcommands (`--scope personal\|team`), and the home/CLI vs trigger vs worker resolution cascade | `guides/cloud/environments.md` § Default Environments and Resolution Cascade |
| Session lifecycle state machine (STARTING / PROCESSING / WAITING_FOR_INPUT / IDLE / COMPLETED / TERMINATED), archived flag, auto-archive | `guides/cloud/sessions.md` |
| Syncing cloud sessions locally (`auggie cloud session sync`), reading another agent's conversation history | `guides/cloud/sessions.md` § Syncing Sessions Locally |
| Launching a session from the CLI with an initial brief (`auggie cloud session create --message …`) | `guides/cloud/sessions.md` § Creating Sessions From the CLI |
| Listing sessions from the CLI (`auggie cloud session list`) — defaults to your own sessions only; pass `--include-shared` to also see OLAC-shared sessions | `guides/cloud/sessions.md` § Listing Sessions From the CLI |
| What happens to descendant workers when a manager / coordinator is archived or deleted (cascade ownership, code_review opt-in flag) | `guides/cloud/workers.md` § How Workers Work |

### Secrets & access control

| If the user is asking about… | Read |
|---|---|
| Secrets (user vs organization), auto-install into VMs, file-mount tags, encoding | `guides/secrets-and-access.md` § Secrets |
| `auggie cloud secret` CLI suite — `list`, `get`, `set`, `delete`, `migrate`, `import` for managing user and tenant secrets from the terminal | `guides/secrets-and-access.md` § CLI Secret Management |
| "How do I set an environment variable in my VM?", "pass an API key to my agent", why `$MY_KEY` is missing, `.env` / `.bashrc` for Cosmos agents | `guides/secrets-and-access.md` § Auto-Install into VMs (every user secret becomes `$UPPER_SNAKE` at VM boot) |
| Difference between per-user env-var-style secrets and environment-bundle `environmentVariables` baked into an environment | `guides/secrets-and-access.md` (per-user, runtime) vs `guides/cloud/environments.md` § Environment Variables (baked into the environment config) |
| Session visibility, sharing a session with a teammate, expert/MCP access control (backend OLAC enforcement vs missing per-recipient share UX) | `guides/secrets-and-access.md` § Access Control and `guides/cloud/sessions.md` |
| Why a shared expert can't reference a private MCP server (tenant-expert / tenant-MCP scope rule) | `guides/secrets-and-access.md` § Experts and MCP Access Control and `guides/compute-models.md` § Backend MCP Registry |
| Per-recipient sharing of an environment / base image with viewer/editor/owner roles | `guides/secrets-and-access.md` § Environment Access Control |

### Compute models (Cloud VM, Daemon, MCP, Skills)

| If the user is asking about… | Read |
|---|---|
| Running agents locally via `auggie daemon`, Cloud VM vs Daemon tradeoffs | `guides/compute-models.md` § Compute Models |
| Pinning an expert to a specific daemon, daemon pool, or base image (`spec.expert.environment.type`: `base_image` \| `pool` \| `daemon`; legacy `spec.expert.daemonVmId` still accepted) | `guides/compute-models.md` § Pinning an Expert to a Daemon or Pool |
| Attaching MCP servers to a Cosmos agent — backend MCP registry (default) vs `--provide-tools` (local-only), per-expert MCP pinning status | `guides/compute-models.md` § MCP |
| Managing MCP server registry entries — `auggie cloud mcp init/validate/diff/apply/list/get/export/delete`, transports (stdio/sse/http), `$augment-<secret>` references, scope (user/tenant) | `guides/compute-models.md` § `auggie cloud mcp` Reference |
| Skills (`.augment/skills/`), writing a skill, when to use a skill vs extend the system prompt | `guides/compute-models.md` § Skills |
| Composing expert prompts from reusable Markdown skills — `<include src="kb://...">` / `vfs://...`, `inline` vs `lazy` mode, `<prompt-module>` / `<lazy-prompt-module>` rendering, `auggie cloud prompt-module render`, max-depth and cycle rules, when the resolver runs (apply lint vs session-start render) | `guides/cloud/writing-expert-prompts.md` § Composable skills via `<include>` directives |
| Which models can I use? Listing available models | Run `auggie model list`. See also `guides/cloud/experts.md` for how the `model` field works. |
| Custom Docker base image for an environment (`spec.environment.baseImage`) | `guides/cloud/environments.md` § Base Image |
| Pre-snapshot vs. per-boot scripts (`--provision-script` vs. `--vm-startup-script`) | `guides/cloud/environments.md` § Custom build scripts |

### CLI & webapp

| If the user is asking about… | Read |
|---|---|
| `auggie cloud expert/trigger/event/environment/integration/...` CLI usage | `guides/cloud/experts.md` and the relevant cloud guide page |
| `auggie cloud expert apply --prune` and trigger reconciliation semantics (workflow ID vs name match, immutable event-source fields, managed vs unmanaged workflow handling) | `guides/cloud/experts.md` § Managing Experts (CLI) |
| `auggie cloud trigger list / get / delete` — inspecting and removing existing triggers from the CLI (creation still goes through the bundle) | `guides/cloud/automations.md` § Triggers |
| `auggie cloud webhook create/list/show/instructions/delete` — managing custom webhooks (typed: `bearer`, `gitlab`, `jira`) referenced by `webhook` triggers | `guides/cloud/automations.md` § Custom Webhooks |
| Expert-level and per-trigger "auto-archive sessions" toggles / `autoCleanupOnIdle` fields (CLI bundle, webapp YAML import/export, and webapp UI expose trigger overrides) | `guides/cloud/experts.md` § expert config, `guides/cloud/automations.md` § `autoCleanupOnIdle`, and `guides/webapp.md` § Triggers |
| Syncing or locating the knowledgebase on disk (`auggie cloud kb sync` / `kb path`) | `guides/cloud/sessions.md` § Knowledgebase |
| The webapp UI — "how do I do X in `/app`", where a button is, what a page does, keyboard shortcuts | `guides/webapp.md` |
| Browsing User or Organization VFS in the webapp (`/vfs/org`, `/vfs/user`); Files sidebar group; how it relates to the in-session **Files** tab (now Environment-FS only) | `guides/webapp.md` § `/vfs/<scope>` and § `/session?agentId=…` |
| Session detail page workspace shell — pinned **Agent / Terminal / Files / Changes / Subscriptions** tabs (Subscriptions = renamed Events, gated by `subscriptionsTabEnabled`), Details right rail, `⋯` actions menu placement | `guides/webapp.md` § `/session?agentId=…` |
| Cosmos usage analytics page (`/analytics`, `poseidon_analytics_page_enabled`) — not for billing | `guides/webapp.md` § `/analytics` |
| Tenant admin console (`/admin`, `poseidon_admin_page_enabled` + `CustomerUiRole_ADMIN`) — Poseidon `AdminService` / `admin_proxy` | `guides/webapp.md` § `/admin` |

### Operations

| If the user is asking about… | Read |
|---|---|
| VM lifecycle, quotas, stuck agents, troubleshooting, capability → tool mapping | `guides/operational-reference.md` |
| Billing, cost, credits, per-session pricing | Not documented in this knowledgebase. Direct the user to the webapp billing page and/or support — do not invent numbers. |

When in doubt, run `grep -ri "TOPIC" ~/.augment/knowledgebase/` (replacing
`TOPIC` with the term you want) — it's fast and almost always finds the
right page.

## Contents

### Guides

- **[Cosmos Guide](guides/cloud/README.md)** — Comprehensive reference
  split into focused pages: self-service, experts, prompts, VFS, workers,
  automations, capabilities, environments, sessions.
- **[Operational Reference](guides/operational-reference.md)** — VM lifecycle, quotas,
  stuck agents, capability→tool mapping, troubleshooting.
- **[Webapp Guide](guides/webapp.md)** — User-facing tour of the Cosmos
  webapp (`/app`): pages, sidebar, command palette, keyboard shortcuts, and a
  "how do I…" lookup table.
- **[Secrets and Access Control](guides/secrets-and-access.md)** — User vs
  organization secrets, auto-install tags, session visibility, session sharing
  via OLAC, current state of per-object access control.
- **[Compute Models, MCP, and Skills](guides/compute-models.md)** — Cloud VM
  vs Daemon, how MCP reaches Cosmos agents today, and how repo-level Skills
  (`.augment/skills/`) complement MCP.
- **[Expert Memory — Breadcrumbs & Knowledge](guides/cloud/expert-memory.md)** —
  Standard layout and file format for expert-team memory
  (`experts/<team>/breadcrumbs/` and `knowledge/`), the default memory
  prompt (append + probabilistic compaction), and the three handoff
  rules that keep curation boundaries clean.
- **[GitLab Environments](guides/cloud/gitlab-environment-setup.md)** — GitLab
  custom environment setup with `glab`, `gitlab-token`, `.netrc`, runtime repo
  clone/fetch, and custom webhook routing for MR experts.

### Expert Templates

Starter expert bundles (YAML) with full system prompts, useful as
**reference when writing new experts**. See
**[expert-templates/README.md](expert-templates/README.md)** for the
list and customization guide.

> **Note:** These templates are examples, not a reflection of what is
> deployed in any given environment. To see deployed experts, run
> `auggie cloud expert list`.

## How to Use

Browse with standard file tools: `read_file`, `list_files`, `grep`, `find`.
Start with this README, then drill into the section you need.
