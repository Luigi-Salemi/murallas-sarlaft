# Cosmos Webapp Guide

How users interact with Cosmos through the browser. Read this when a
user asks "how do I … in the webapp", "where is X in the UI", "what does
this button do", or any other question about the `/app` interface. For the
underlying concepts (experts, triggers, capabilities, VFS, workers), read
the [`cloud/` guide](cloud/README.md). For CLI usage, point them
at `auggie cloud --help`.

## Where It Lives

The webapp lives under the `/app/...` path on your tenant's Cosmos
URL. All in‑app routes below are shown without the `/app` prefix.

The webapp is a React SPA (`clients/web/app`) served from `web_rpc_proxy`.
It is the primary interface for non‑CLI users; CLI users typically use
`/sessions` and `/experts` to monitor/manage what their CLI agents are doing.

## Sidebar Layout (top → bottom)

1. **New session** → `/home` — entry point for launching agents (shortcut shown beside the item).
2. **Sessions** → `/sessions` — list of all your agent sessions.
3. **Configuration** group (collapsible, sliders icon) — Experts, Environments, _Daemons_ (flag), Integrations, _MCP Registry_ (flag), _Webhooks_ (flag), **Events log** (shown when `automationsEnabled` is off), Secrets, _Admin_ (flag, tenant admins only). Secrets is always shown; the flag-gated items appear only when their feature flag is on. There is no separate **Debug** sidebar group — `/events` lives inside Configuration as **Events log**.
4. **Files** group (folder icon) — **Organization** → `/vfs/org`, **User** → `/vfs/user`. Top-level browsers for the Organization (tenant) and User VFS scopes; the in-session **Files** workspace tab is now Environment-FS only (see [`/vfs/<scope>`](#vfsscope--top-level-files-vfs-page) below).
5. **Recent sessions** — up to 30 most recent root sessions, clickable. `Alt+1`…`Alt+9` jumps to the Nth.
6. **User profile pill** (bottom) — name, email, click to open menu → **Get Started** onboarding shortcut (when applicable), **My Settings** (`/my-settings`), **Analytics** (`/analytics`, flag), an inline **light / dark / system** theme toggle, and **Logout**.

**Not in the sidebar but reachable directly:** `/capabilities/detail?id=…`.
Users get to it from session detail pages or direct URL. Older URLs `/agents`,
`/agents-table`, `/experts-table`, `/events-table` redirect to the canonical
paths.

## Keyboard Shortcuts (verified registry)

`mod` = `Cmd` on macOS, `Ctrl` on Windows/Linux. Source of truth:
`clients/web/app/src/lib/keyboard-shortcuts.ts`.

| Shortcut | Action |
|---|---|
| `mod+k` | Open the command palette |
| `mod+shift+o` | New session (`/home`) |
| `mod+shift+l` | Go to sessions list (`/sessions`) |
| `alt+1` … `alt+9` | Jump to the Nth recent session |
| `mod+period` | Toggle the left sidebar |
| `mod+slash` | Show the keyboard shortcuts dialog |
| `mod+shift+period` | Toggle the right sidebar (only on a session page) |
| `escape` | Unfocus the current input |

There is **no** `mod+shift+p` shortcut for the command palette — only `mod+k`.

## Command Palette (`Cmd+K`)

The global launcher. Fuzzy search across:

- **New Session** action
- **Navigation** entries (Sessions, Experts, Environments, Integrations, …)
- **Sessions** (recent + server‑side debounced search of all your sessions)
- **Application actions** (toggle sidebar, show shortcuts, …)

Use it to reach pages that aren't in the sidebar (VMs, Snapshots), to jump
to a session by name, or to discover the shortcut for an action.

---

## Pages — Cosmos

### `/home` — New Session Entry

Landing page after login. The page is a single `HomePage` component
(composer + expert launcher grid) that lets the user:

- Type a first message and pick **Model**, **Environment** (VM or Daemon),
  **Capabilities**, optional **Worker experts**, and the **Shared**
  toggle (on by default — the server grants the tenant a viewer OLAC
  binding so other tenant members can see the session; turn it off to
  create a private session) — then **Create Session**.
- Click an expert card to launch a session pre‑configured from that expert's
  bundle (model / environment / capabilities come from the expert; the
  user only picks visibility and the first message).
- Deep‑link via `/home` with query params:
  `?expertId=…&message=…` opens the home page with the expert's start
  sheet expanded and the message pre‑filled. The user sees the launcher
  and clicks Create. Both params are optional and work independently.
  See [`cloud/experts.md` § Deep Links](cloud/experts.md#deep-links).

Environment defaults resolve as: user default → team default → only env →
first available. Selecting an expert auto‑renames the session to
`{Expert Name} Agent` and restores your typed name if you deselect.

### `/sessions` — Sessions Table

Central hub for everything you've run. Two tabs: **My sessions** and
**All sessions** (the latter includes sessions shared with you). Each row
shows:

- Session name (linked, inline‑renamable), expert badge, visibility icon,
  status dot, message count, "unread" indicator if the agent finished while
  you were away, archived strikethrough.
- **Status** (Processing / Waiting / Inactive / Error / Ready), **Type**
  (VM / CLI), **Last Active**, **Created**, **Created by** (only in All
  sessions).
- Worker‑expert child sessions are nested under their parent with a chevron;
  if the parent is off‑page, orphaned children show their parent name as
  metadata.

**Filtering & search:** global fuzzy search by name (debounced 300 ms), plus
filters for **Status**, **Type**, **Completion** (Unread), **Archived**
(Active / Archived / All), and **Expert**. Click "Reset filters" to clear.

**Per‑row actions** (3‑dot menu): rename, archive / unarchive, copy link.
**Bulk actions:** check the row checkboxes (Shift+Click for range) → the
toolbar exposes **Archive**. Only owners can select / bulk‑archive; viewers
see a disabled column. Pagination is cursor‑based with 10 / 25 / 50 / 100
rows per page.

Click a row to open `/session?agentId=…`. `Cmd/Ctrl+Click` opens it in a
new tab. The "+ New session" button in the top‑right routes to
`/home`.

### `/session?agentId=…` — Session Detail (Workspace)

The session page is a **workspace shell** with a static, pinned tab strip
across the top of the main pane and a fixed-width **Details** pane on the
right (toggle with the **PanelRight** icon at the top-right or
`mod+shift+period`). Tabs are non-closable; there is no `+` button or drag-
to-rearrange in the strip.

**Top-bar layout:** session title on the left → `⋯` session-actions menu
(rename, share, delete, archive, export) immediately next to the title →
breadcrumbs / agent status in the middle → **Details** toggle pinned to
the far right.

**Pinned tabs (in this order):**

| Tab | Label / icon | Shown when |
|---|---|---|
| Chat | **Agent** (`MessageSquare`) | Always |
| Terminal | **Terminal** (`TerminalSquare`) | Always (renders the VM terminal when the session has a VM capability; otherwise an empty-state). |
| Files | **Files** (`Database`) | Always — Environment-FS only. The User and Organization VFS scopes moved to the top-level [`/vfs/<scope>`](#vfsscope--top-level-files-vfs-page) pages, so the in-session Files tab no longer has a filesystem selector. Deep links use `tab=vfs&fs=env&file=…`; legacy `fs=user|tenant` query params are ignored. |
| Changes | **Changes** (`FileDiff`) | When the `gitDiffPanelEnabled` flag is on. Git diff panel for the session's working tree. |
| Subscriptions | **Subscriptions** (`Bell`) | When the `subscriptionsTabEnabled` flag is on (default off in dev). Renamed from **Events**, promoted from a right-rail tab to a top-level workspace tab; lists the active event subscriptions for this agent. |

**Details pane (right rail):** session config (name, expert, model,
visibility, capabilities, base image, timestamps), the **Share** dialog
trigger, and the **Delete** button. Owners can flip the Private↔Shared
toggle here. The pane is fixed-width (no second-level tab bar) and toggle-
collapsible.

**Chat (Agent) tab supports:**

- **Send / Stop / Retry** on user messages.
- **Tool-call rendering** (expand to see input/output, status badges:
  running, pending approval, denied, complete).
- **Approve / Deny** prompts when the agent calls a capability that
  requires user approval.
- **Ask-user prompts** — when the agent calls `ask-user`, the input area is
  replaced with the question(s) plus suggested responses and a Skip button
  (Skip sends `[User declined to answer]`).
- **Drafts** persist in `localStorage` so unsent input survives a reload.
- **View-only banner** when the session was shared with you as a viewer —
  the input is disabled.

Recipients of a shared link land here directly. If the session ID is
unknown or access is denied, the page shows an error banner instead of
the workspace.

### `/vfs/<scope>` — Top-Level Files (VFS) Page

The two top-level Files browsers, surfaced via the sidebar's **Files**
group. `<scope>` is `org` (Organization VFS, backed by the `tenant`
filesystem id) or `user` (User VFS). The bare `/vfs` URL redirects to the
last-visited scope (defaults to `/vfs/org`). Sub-paths `/<scope>/<path>`
deep-link into a directory or file; `?view=focus` swaps the page chrome
for a focus overlay around the current file.

Layout mirrors the in-session Files tab: a **secondary file-tree
sidebar** on the left (collapse toggle, refresh, per-sub-directory error
banner), a breadcrumb header (item count + aggregate size on directories;
metadata row on files), a **directory view** (table of children, dirs
before files, case-insensitive sort) for intermediate paths, and a **file
view** (preview pane for the selected file) for leaves.

These pages own User and Organization VFS browsing for the whole webapp;
the in-session **Files** workspace tab is intentionally limited to the
session's Environment FS so the two scopes don't overlap.

### `/experts` — Experts Table

List of expert templates the user can apply at session creation. Columns
include name, description excerpt, visibility, created‑by, and a trigger
count (number of `spec.triggers[]` attached to that expert in its bundle).
Per‑row 3‑dot menu: **Start Session**, **Edit**, **Duplicate**,
**Favorite**, and **Delete** when permitted. The top‑right **+ Create
Expert** button goes to `/experts/create`.

Deleting an expert orphans (does not delete) any sessions that already
used it.

### `/experts/create` and `/experts/:expertId` — Expert Editor

Same component for both create and edit. Sections:

- **Basic** — Name, Description, **System Prompt**, **User Instructions**
  (both have an "expand" button that opens a full‑screen editor).
- **Execution** — Model, Environment, Capabilities (multi‑select),
  **Worker Experts** (multi‑select; subordinate experts the agent can
  dispatch via `worker-*` tools), Visibility.
- **Triggers** — inline editor for `spec.triggers[]`. Each entry binds an
  external event (GitHub PR, Linear issue, Slack message, scheduled, …)
  to "launch a session from this expert". Each trigger row also has an
  **"Auto-archive sessions created by this trigger"** toggle (default
  on); turning it off persists `auto_cleanup_on_idle: false` in the
  exported YAML and stops trigger-created sessions from being
  auto-archived after they go idle — useful for revisitable
  agent-driven sessions (e.g. PR-author). See
  [`cloud/automations.md`](cloud/automations.md).

Buttons: **Save**, **Cancel**, **Delete** (edit mode only).

### `/environments` and `/environments/create` · `/environments/:id`

VM base images plus toolchain configuration. Table shows name,
type (Modal VM vs template), resources, last used, shared status, and a
default star (user default) / outline star (team default). Per‑row menu:
**Edit**, **Duplicate** ("‑copy" suffix), **Delete**, **Set as user
default**, **Set as team default** (admins).

The detail editor lets the user pick a base image, add Git repos to
clone on boot (with branch selection from the GitHub integration), and
define environment-scoped environment variables
(`spec.environment.environmentVariables` in the bundle) that every
session launched from this environment inherits. Used by the environment
selector in `/home` and the expert editor.

Per-user **secrets** are not managed here — they live on the dedicated
`/secrets` page under the sidebar **Configuration** group (see that
section below). CPU / RAM are not configured on the environment; they
are an optional override on the **expert** (`spec.expert.environment.resources`,
see [`cloud/experts.md`](cloud/experts.md#vm-resources-cpu--ram)).

### `/integrations` — Team Integrations

Three tiles, one per integration the team can connect once for everyone:
**GitHub App**, **Linear**, **Slack**. Each tile shows install/connect
state, opens the provider OAuth flow in a new tab, and re‑checks status
when the user returns to the tab (debounced ~5 s). Disconnect is exposed
inline. These are required prerequisites for any expert that uses the
matching `*_APP` capability or fires on the matching trigger type — see
[`cloud/automations.md`](cloud/automations.md#setup-walkthrough).

### `/my-settings` — Account Settings

Reached from the **user profile pill** at the very bottom of the sidebar →
**My Settings**, or by navigating directly to `/my-settings`. It is
**not** listed in the sidebar's **Configuration** group (that group
contains Experts, Environments, Integrations, Secrets, Admin, etc. — not
Account Settings).

Per‑user configuration sections on this page:

- **GitHub personal** OAuth (separate from the team GitHub App).
- **Linear personal** OAuth.
- **Defaults** — preferred model and base image used when launching new
  sessions without an explicit choice.

Secrets management is **not** on this page — it has its own `/secrets`
page in the **Configuration** sidebar group (see below).

### `/secrets` — Secrets Manager

Reached from the sidebar **Configuration** group → **Secrets**, or by
navigating directly to `/secrets`. Manages secrets that are injected
into agent VMs.

Two secret types are supported: **environment‑variable secrets** and
**mounted‑file secrets**. Secrets can be **personal** (visible only to
you) or **shared / team‑scoped** (visible to all team members; the
shared‑secrets UI is gated by the `isSharedSecretsUiEnabled` flag).
The page provides **add / edit / delete** operations and a **search**
box to filter the list. Secrets are encrypted at rest; values are not
retrievable after save — to update a value, delete the secret and
recreate it.

### `/admin` — Tenant Admin (feature‑flagged, admins only)

Sidebar **Configuration** group → **Admin**. Gated on
`customer_ui_poseidon_enabled` + `poseidon_admin_page_enabled` **and**
the user's `CustomerUiRole_ADMIN` role; non‑admins are redirected to
`/home`. The link is a UX guard only — Poseidon enforces the same gate
server‑side via `RequireTenantAdminOrStaff` on every `AdminService` RPC
(also reachable through the `web_rpc_proxy` `admin_proxy` endpoint).

Surfaces the tenant‑admin operations: inspect agents / VMs / daemons /
admission queue, quarantine users (blocks `PoseidonService.CreateAgent`
without touching their account elsewhere), and run admin actions like
force‑archive and clearing stuck `detailed_status`.

### `/analytics` — Cosmos Usage Analytics (feature‑flagged)

User‑profile‑pill dropdown → **Analytics** (also command palette / direct
URL; not in the sidebar). Gated on `poseidon_analytics_page_enabled` —
the route guard redirects to `/home` when the flag is off, so pre‑rollout
bookmarks don't leak the page. Aggregate Cosmos usage charts (sessions
per day, expert / model breakdown, etc.). **Not for billing or credits**
— use the billing pages for those.

### `/capabilities/detail?id=…` — VM Operations

Not in the sidebar; reach from session detail pages or direct URL.

- `/capabilities/detail?id=…` — full‑screen view of a single VM with an
  interactive terminal and Start / Stop / Reboot / Snapshot controls. The
  same terminal is embedded as the **Terminal** tab inside the session
  detail page.

### `/events` — Events log

Lives in the **Configuration** sidebar group as **Events log** (there is
no separate Debug sidebar group). When the `automationsEnabled` feature
flag is on, this entry is hidden in favor of `/automations`. Raw view
of every external event the team's integrations have received: GitHub,
Linear, Slack, scheduled, webhook, etc. Search by event type, agent ID,
subscription ID, or payload fields. Click a row to inspect the full
JSON payload. This is the same data the CLI's `auggie cloud event list`
exposes — use it to debug why a trigger did or didn't fire and to
capture real payloads before writing JSONLogic filters (see
[`cloud/automations.md`](cloud/automations.md#iterating-on-filters-with-event-queries)).

### `/mcp` and `/mcp/callback` — MCP Registry (feature‑flagged)

Visible only when `enable_mcp_registry_route` is on. Browse MCP servers
the team can install as additional agent tools. Each server card shows
required permissions and an Install button that drives an OAuth flow
where applicable. `/mcp/callback` is the OAuth return; users don't visit
it directly.

### `/daemons` — Daemons (feature‑flagged)

Visible only when `poseidon_daemon_enabled` is on. Long‑running daemon VMs
that listen for events and spawn sessions instead of being created
on‑demand. Manage lifecycle (start / stop / delete), attach triggers,
and inspect sessions a daemon has spawned. When the flag is on, **Daemon**
also becomes a selectable environment type on `/home`.

### `/webhooks` — Custom Webhooks (feature‑flagged)

Visible only when `poseidon_webhooks_enabled` is on. Lets the user mint
**custom webhook URLs** that an external system can POST to in order to
fire a Cosmos `webhook` trigger event. Each row shows the webhook's
display name, its trigger URL (`/webhooks/{id}` on the api_proxy
domain — the **Copy** button copies it), **Visibility** (Private or
Shared), creation time, and owner-only **Delete** action. **+ Create
webhook** opens a dialog with a Private/Shared selector that defaults to
**Shared with workspace**; owners can later flip the row selector between
Private and Shared. There is no per-recipient webhook sharing UI yet.
On save, the dialog reveals the **signing secret** **once** — copy it
then, since it cannot be retrieved again. Pair these URLs with `webhook`
triggers in an expert bundle to launch sessions from arbitrary external
systems (see
[`cloud/automations.md`](cloud/automations.md)).

---

## Backwards‑Compat Redirects

These older URLs still work and 301 to the canonical paths:

| Old | New |
|---|---|
| `/agents`, `/agents-table` | `/sessions` |
| `/experts-table` | `/experts` |
| `/events-table` | `/events` |

If a user shares a link with an old path, it will land them on the right
page automatically.

---

## When the User Asks "How Do I …"

| Question | Answer |
|---|---|
| Start a new agent | Click **New session** (`Cmd+Shift+O`) → fill form → **Create Session**. Or pick an expert card on `/home` to launch with that expert's config. |
| Find a specific session | `Cmd+K` → start typing the session name. Or `/sessions` and use the search box. |
| Share a session with a teammate | Open the session → `⋯` session-actions menu (next to the title) **or** the **Share** trigger in the **Details** right rail → toggle to **Shared** → copy the link. Only owners can change visibility. |
| Browse the User or Organization VFS | Sidebar → **Files** group → **User** (`/vfs/user`) or **Organization** (`/vfs/org`). The in-session **Files** tab is Environment-FS only. |
| Inspect the agent's Environment files | Open the session → **Files** tab. (User/Org VFS lives at `/vfs/<scope>` instead.) |
| Stop a session that's running | Open the session → click the red **Stop** button while the agent is processing. |
| Archive old sessions | `/sessions` → check the rows (Shift‑click for ranges) → **Archive**. They reappear under the **Archived** filter. |
| Make their own expert | `/experts` → **+ Create Expert**. |
| Edit an existing expert | `/experts` → click the row, or 3‑dot **Edit**. |
| Wire an expert to fire on PR open / Linear issue / cron | Edit the expert → **Triggers** section → add a trigger. Walkthrough: [`cloud/automations.md`](cloud/automations.md#setup-walkthrough). |
| Connect GitHub / Linear / Slack | `/integrations` for the **team** install (one click, OAuth in a new tab). `/my-settings/integrations/github` and `/my-settings/integrations/linear` for **personal** GitHub / Linear OAuth used by the user's own sessions. |
| Manage secrets / API keys | Sidebar **Configuration** group → **Secrets** (`/secrets`). Supports env‑var and file secrets, personal or shared. |
| Change their default model or VM | `/my-settings` → Defaults section. |
| Inspect or snapshot a session VM | Open the session → **Terminal** tab, or open `/capabilities/detail?id=…` for the VM. |
| Debug why a trigger didn't fire | `/events` → filter by source / event type → inspect the payload. Same data as `auggie cloud event list`. |
| Find the keyboard shortcuts | Press `mod+slash` to open the in‑app shortcuts dialog. |

For anything that's a **CLI** question (`auggie cloud expert apply`,
`auggie cloud event list`, …), point the user at `auggie cloud --help`
and the `guides/cloud/` pages instead — the webapp covers a strict
subset of what the CLI exposes.
