# Secrets and Access Control

How Cosmos agents get credentials, and who can see / act on what.

## Secrets

Cosmos agents commonly need credentials beyond the built-in integrations —
database passwords, internal API tokens, mTLS client certs, package-manager
credentials. These live in the Augment **secrets** subsystem and are
injected into the VM at boot.

### User Secrets

Scoped to the creating user. Only that user's sessions can see them.
Encrypted at rest.

Manage them via the webapp `/secrets` page (sidebar **Configuration** →
**Secrets**) or via the `auggie cloud secret` CLI subcommands (see
[CLI Secret Management](#cli-secret-management) below).

### Tenant Secrets

Shared across the entire tenant — the right choice for "the company's
Datadog API key" or "the shared Snowflake user". Managed by admins.
Governed by **OLAC** (Object-Level Access Control) so reads, writes, and
deletes are explicitly grantable and deniable. Defaults are fail-closed.

For the purposes of this guide, treat user and tenant secrets as two
independent buckets with two independent sharing models.

### Auto-Install into VMs

By default, every secret the user can see is **auto-injected** into the
cloud VM as an environment variable when the session starts. Name
transform:

- hyphens and periods → underscores
- lowercase → uppercase

So a secret named `my-api.key` becomes `MY_API_KEY` in the agent's
environment.

Opt out per-secret by setting the tag `augment:auto_install = "false"` on
the secret. It will still exist in the backend, but won't be injected —
use this for secrets that only specific experts should receive (you can
then reference them explicitly from that expert's configuration).

### Setting Environment Variables in a Cloud VM

There is no separate "env var" feature for Cosmos agents — **the Secrets
Manager is the env-var mechanism**. Create a user secret and it is
exported in the VM shell as `$UPPER_SNAKE_NAME` at boot. For example,
a secret named `openai-api-key` becomes `$OPENAI_API_KEY`.

- Manage secrets in the webapp: sidebar **Configuration** → **Secrets** (`/secrets`).
- Do **not** put env vars in `.bashrc`, `.profile`, or a `.env` file in
  the workspace / VFS — `.bashrc` is wiped on environment refresh, and
  the VFS is a file store, not a shell-environment source.
- For environment-wide defaults that every session in an environment
  should see (not per-user), use the environment bundle's
  `spec.environment.environmentVariables` field (an array of
  `{ name, value }` entries) — see
  `cloud/environments.md` § Environment Variables.

### File Secrets

Some secrets (TLS certs, kube configs, SSH keys) need to land on disk
rather than in an env var. Tag the secret with one of:

- `augment:mount_point = "/path/inside/vm"`
- `augment:target_path = "/path/inside/vm"`

The secret's value is written to that path inside the VM at boot. Combine
with base64 encoding (see below) for binary content.

### Base64 Encoding

Binary secrets (PEM-encoded certs, private keys) can be stored
base64-encoded. The injection pipeline decodes them back to raw bytes when
writing to disk or exposing them to the agent.

### CLI Secret Management

The `auggie cloud secret` command provides access to user secrets and
to tenant secrets the current identity is authorized to manage, without
leaving the terminal. Subcommands (see `auggie cloud secret --help`):

| Subcommand | Purpose | Key flags |
|---|---|---|
| `list` | List secret metadata (no values) | `--scope user\|tenant\|all` (default `all`), `--tag k=v`, `--json` |
| `get <name>` | Fetch a single secret; value redacted by default | `--scope`, `--reveal` (include the value), `--json` |
| `set <name>` | Create or update a secret | `--scope user\|tenant`, `--value`, `--from-file <path>`, `--from-stdin`, `--description`, `--tag k=v` (repeatable, e.g. `augment:mount_point=…` for file mounts), `--expected-version` (optimistic concurrency) |
| `delete <name>` | Delete a secret | `--scope`, `-y/--yes`, `--expected-version` |
| `migrate <name>` | Copy or move a secret between user and tenant scopes | `--from`, `--to`, `--move` (delete source after copy), `-y/--yes` |
| `import <file>` | Bulk-import from `.env`, JSON, or CSV | `--scope`, `--dry-run`, `--continue-on-error` |

Avoid `set --value <literal>` — the value will land in shell history.
Prefer `--from-stdin` (`pbpaste \| auggie cloud secret set …`),
`--from-file`, or the interactive prompt that fires when no value flag
is passed. To retrieve a value after creation, use
`auggie cloud secret get <name> --reveal` or the webapp Secrets page's
view modal reveal/copy/download controls. Both surfaces call the same
backend and are subject to the same authorization checks.

The CLI calls the same backend and tag conventions as the webapp, so
secrets created via `auggie cloud secret set` are auto-installed into
VMs as `$UPPER_SNAKE` env vars (or mounted at `augment:mount_point`)
exactly like webapp-created ones.

### What Never Happens

- Secrets are **never** logged by the platform.
- Secrets are **never** written to the session history or Chat Host.
- Secrets are **never** shipped as part of VM log batches to Cloud
  Logging.

If an agent's system prompt asks it to echo or print a secret, it will
probably do so — that's on the prompt author, not the platform. Don't put
secrets into prompts; pull them at runtime from env vars or files.

## Access Control

### Sessions (Shipped)

Session visibility has two meaningful values (see also
`cloud/sessions.md` § Session Visibility and Sharing):

- `SESSION_VISIBILITY_SHARED` — everyone in the tenant can see it.
- `SESSION_VISIBILITY_PRIVATE` — only the creator can see it.

Defaults depend on how the session was created:

| Source | Default |
|---|---|
| Launched from a **tenant-scoped expert** | `SHARED` |
| Launched from a **user-scoped expert** | `PRIVATE` |
| Created by a **trigger / bot** | `SHARED` |

Owners can explicitly grant access to individual teammates via the
webapp Share button, backed by the `ShareSession` RPC.
Granted users get **viewer** access — they can read session history but
cannot post messages, run tools, or delete the session. `UnshareSession`
revokes access. `ListSessionAccess` enumerates the current set of users.

> A dedicated `auggie cloud session share` CLI command is not yet wired
> — the RPC exists but must currently be invoked from the webapp (or
> directly via gRPC for scripted use).

All of this is OLAC-backed with **fail-closed** defaults: if the platform
can't positively confirm a user has a role, the answer is "no".

### Experts and MCP Access Control

Backend object-level access control (OLAC) **is** enforced on expert
RPCs today — the `poseidon_expert_olac_interceptor` flag is enabled in
production, so `GetExpert`, `UpdateExpert`, `DeleteExpert`,
`RestoreExpert`, `CreateAgentFromExpert`, `ListExpertVersions`, and
`GetExpertVersion` all go through OLAC checks (creator-binding granted
on create; tenant-binding for `tenant`-scoped experts).

Per-recipient sharing of experts **is shipped in the webapp**: the
expert detail/edit form has a **Sharing** section with a **Share expert**
button (visible to owners) that opens `ShareExpertDialog` — a wrapper
around the generic `OlacShareDialog`. It uses the generic OLAC RPCs
(`grantObjectRole`, `revokeObjectRole`, `listExpertAccess`) on
`AuthzProxyService` to grant **viewer / editor / owner** roles to
specific teammates. There is no dedicated `ShareExpert` / `UnshareExpert`
RPC; everything goes through the generic OLAC surface.

What is **not** wired yet:

- No `auggie cloud expert share` CLI command — sharing must currently be
  done from the webapp (or directly via the generic OLAC RPCs).
- No per-recipient sharing UX for **MCP registry entries** — those are
  still coarse-grained scope only (see below).

Coarse scopes still apply for visibility/discovery:

- **Experts** — `spec.expert.visibility` is `user` (private to the
  creator) or `tenant` (everyone in the tenant). Per-recipient OLAC
  bindings layer on top of those scopes (e.g. you can keep an expert
  `user`-scoped and grant viewer access to a specific teammate via the
  Share dialog).
- **MCP servers** — MCP server configurations are stored server-side in
  the **MCP registry** with the same coarse-grained scopes as experts:
  `user` (private) or `tenant` (shared with the whole tenant). Manage
  them with `auggie cloud mcp` (see
  [`compute-models.md` § MCP](compute-models.md#mcp-model-context-protocol)).
  Per-expert pinning of registry MCPs is exposed both in the **webapp
  expert editor's Tools section** and in the **CLI `ExpertBundle` YAML
  schema** (`spec.expert.mcpConfigIds`), both persisted to
  `ExpertConfig.mcp_config_ids`. Users can also override the expert's
  MCPs per-session via the webapp launcher's MCP selector.
  Local-only `--provide-tools --mcp-config` is still supported for
  MCP servers that are not in the registry.
  - **Scope rule (enforced):** a tenant-scoped expert can only
    reference tenant-scoped MCP registry entries — referencing a
    private MCP from a shared expert is rejected by both the webapp
    editor and `expert_service.go` validation. User-scoped experts
    can reference either scope.

If a user asks for fine-grained per-recipient expert sharing, point them
at the **Share expert** button on the expert page. For MCP registry
entries the answer is still coarse `user` / `tenant` only — no
per-recipient share UX yet.

### Environment Access Control

Environments (VM base images / templates) have **per-recipient OLAC
sharing in the webapp**. The share UX and backend enforcement below
are on by default for all tenants.

- The `EnvironmentDetailPage` header shows a **Share** button (visible to
  owners). It opens a `ShareEnvironmentDialog` that uses the generic OLAC
  RPCs — `grantObjectRole`, `revokeObjectRole`, `listObjectRoleBindings`
  on `AuthzProxyService` — to grant **viewer**, **editor**, or **owner**
  roles to specific teammates.
- Backend OLAC interceptors enforce access on `GetBaseImage`,
  `DeleteBaseImage`, `RefreshEnvironment`, and (handler-level) on
  `UpdateBaseImage`; `CreateBaseImage` and `DuplicateBaseImage` grant the
  creator an OLAC owner binding. `ListBaseImages` accepts an
  `include_olac_shared` flag so the UI can surface environments shared
  *to* the user in addition to ones they own.

### Custom Webhook Access Control

Custom webhook visibility is OLAC-backed with the same coarse Private /
Shared model used by experts and environments. New webhooks default to
**Shared** (`WEBHOOK_SCOPE_TENANT`), which grants tenant-wide `viewer`
access so teammates can discover and use the webhook as a trigger without
gaining delete/manage-access permissions. Owners can flip the webapp row
selector to **Private** (`WEBHOOK_SCOPE_USER`) to revoke tenant-wide access.

There is intentionally no per-recipient webhook sharing UI yet, even
though the underlying generic OLAC APIs support additional bindings.
### Per-Recipient Sharing Matrix

Quick comparison of where per-recipient OLAC sharing is wired end-to-end today:

| Resource | Webapp share UI | Dialog component | Dedicated RPC | CLI share command | Coarse `user` / `tenant` scope |
|---|---|---|---|---|---|
| **Sessions** | Yes — Share button on session page | (session-specific) | `ShareSession` / `UnshareSession` / `ListSessionAccess` | No (`auggie cloud session share` not wired) | n/a (sessions use SHARED/PRIVATE visibility) |
| **Experts** | Yes — Share expert button in expert form's Sharing section | `ShareExpertDialog` (wraps `OlacShareDialog`) | No — uses generic OLAC `grantObjectRole` / `revokeObjectRole` / `listExpertAccess` | No (`auggie cloud expert share` not wired) | Yes (`spec.expert.visibility`: `user` or `tenant`) |
| **Environments** | Yes — Share button on environment detail page | `ShareEnvironmentDialog` | No — uses generic OLAC `grantObjectRole` / `revokeObjectRole` / `listObjectRoleBindings` | No | No — OLAC is the sole authorization path |
| **Custom webhooks** | No per-recipient UI — owners only get Private/Shared toggle | n/a | No — toggle uses generic OLAC tenant grant/revoke | No | Yes (`WebhookScope`: `USER` or `TENANT`; defaults to `TENANT`) |
| **MCP registry entries** | No — coarse scope only | n/a | n/a | n/a | Yes (`scope`: `user` or `tenant`) |

## Quick Reference for Agents

| User asks… | Point them at |
|---|---|
| "How do I store an API key my agent can use?" | Webapp `/secrets` page (sidebar **Configuration** → **Secrets**) or `auggie cloud secret set <name> --from-stdin`; auto-injects unless `augment:auto_install=false`. |
| "How do I set an env var in my VM?" / "pass `$FOO` to my agent" | Same place — webapp `/secrets` or `auggie cloud secret set`. Every user secret is exported as `$UPPER_SNAKE` at boot. |
| "Is there a `.env` / `.bashrc` mechanism for Cosmos agents?" | No. Use the secrets manager (webapp `/secrets` or `auggie cloud secret`); don't edit `.bashrc` (wiped on refresh) or drop `.env` into the VFS (files only, not shell env). For bulk import of an existing `.env`: `auggie cloud secret import .env`. |
| "How do I mount a cert file in the VM?" | Secret with `augment:mount_point` or `augment:target_path` tag. |
| "Why isn't my secret showing up as `$MY_SECRET`?" | Name transform: hyphens/dots → underscores, uppercase. |
| "How do I share a session with a teammate?" | Use the Share button in the webapp session page. No CLI command yet. |
| "Can I share an expert with just one person?" | Yes — open the expert page → **Sharing** section → **Share expert** button (owners only). Uses the generic OLAC `grantObjectRole` / `revokeObjectRole` RPCs to grant viewer/editor/owner. There is no dedicated `ShareExpert` RPC and no `auggie cloud expert share` CLI yet. |
| "Can I share an environment / base image with just one teammate?" | Yes — open the environment detail page → **Share** → grant viewer/editor/owner. |
| "Can I make a custom webhook private?" | Yes — `/webhooks` → row **Visibility** selector → **Private**. New webhooks default to **Shared with workspace**. |
| "Can a shared expert reference my private MCP server?" | No — tenant-scoped experts can only reference tenant-scoped MCP registry entries. Either move the MCP entry to `tenant` scope or keep the expert `user`-scoped. |
| "Is it safe to put a secret in my system prompt?" | No — prompts are stored in history. Pull secrets from env vars or files at runtime. |

## Related Reading

- `cloud/sessions.md` § Session Visibility and Sharing
- `operational-reference.md` § Environment Variables in VMs (covers
  `AUGMENT_SESSION_AUTH`, `POSEIDON_ENDPOINT`, and the secret name
  transform rules)
- `webapp.md` § `/secrets` (Secrets Manager UI)
