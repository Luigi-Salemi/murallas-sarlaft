# Automations: Triggers and Subscriptions

There are two mechanisms for event-driven automation:

## Triggers (Persistent, Bundle-Configured)

Triggers are **persistent event-to-expert bindings** declared in an expert
bundle. Anyone (human or agent) who can `auggie cloud expert apply` the bundle
can create or update them. When a matching event arrives, a new agent session
is created from the expert.

Triggers are configured inside an `ExpertBundle` under `spec.triggers`. To
**create or update** a trigger, edit the expert's bundle YAML and run
`auggie cloud expert apply -f bundle.yaml`.

There is also an `auggie cloud trigger` command for **inspection and removal**
of existing triggers (it does not create them — creation goes through the
bundle). The available subcommands are `list` (optionally filtered by
`--expert-id`), `get <trigger-id>`, and `delete <trigger-id> [--force]`.

```yaml
spec:
  expert: { ... }
  triggers:
    - name: on-pr-opened
      type: github
      eventType: pull_request
      filter: '{"==": [{"var": "action"}, "opened"]}'
```

### Trigger Types

In `spec.triggers[]`, set `type` to one of the values below. The `eventType`
field uses the source service's native event names.

| `type` | Required pair | Example `eventType` values |
|--------|---------------|----------------------------|
| `github` | `eventType` | `pull_request`, `push`, `issue_comment`, `pull_request_review_comment` — **Note:** GitHub does not send webhook events for emoji reactions; there is no `reaction` event type. Agents that need to monitor reactions must poll the GitHub REST API on a schedule. |
| `linear` | `eventType` | `Issue`, `Comment`, `Project` |
| `slack` | `eventType` | `app_mention`, `message` |
| `pagerduty` | `pagerdutyRoutingKey` | (no `eventType` — PagerDuty events are routed by integration key; use `filter` on `event.event_type` / `event.data.*` if you need to match a specific action) |
| `webhook` | `webhookId` | (custom webhook from a third-party service) |
| `scheduled` | `cronExpression` | (no `eventType`; e.g. `0 9 * * MON-FRI`, optional `timezone` — IANA name, DST-aware) |

Each trigger also accepts an optional `enabled: false` field to temporarily disable it without removing it from the bundle.

#### Custom Webhooks

A `webhook` trigger fires when a third-party service POSTs to a tenant-scoped
webhook URL of the form `https://<tenant>.api.augmentcode.com/webhooks/<id>`.
Each webhook has a typed authentication/provider handler — set the type at
creation time to one of:

| Type | Use for |
|------|---------|
| `bearer` | Generic webhooks authenticated with a static `Authorization: Bearer <secret>` header (the secret is generated server-side and shown once at creation) |
| `gitlab` | GitLab project/group/system hooks (signature verified against the GitLab token) |
| `jira` | Jira automation webhooks |
| `github` | GitHub / GitHub Enterprise webhooks (signature verified with `X-Hub-Signature-256` HMAC-SHA256). Use this for GitHub Enterprise Server or repos where the GitHub App integration isn't available; for github.com, prefer the `github` trigger `type` above (GitHub App-backed). |

Manage custom webhooks from the CLI with `auggie cloud webhook`:

```bash
auggie cloud webhook create --type gitlab --description "GitLab project"
auggie cloud webhook create --type bearer --description-file ./webhook.md
auggie cloud webhook list
auggie cloud webhook show <webhook-id>          # full multi-line description
auggie cloud webhook update <webhook-id> --description-file ./webhook.md
auggie cloud webhook instructions <webhook-id>  # provider-specific setup steps
auggie cloud webhook delete <webhook-id> --force
```

`create` prints both the trigger URL and the secret once — capture both
immediately, the secret cannot be retrieved later. `instructions` re-prints the
provider-specific setup steps (URL, header / signature requirements) for an
existing webhook. The webapp `/webhooks` page exposes the same surface.

The `description` field is multi-line and free-form. Convention: the **first
line** is a short summary (shown by `webhook list`; the webapp table truncates
the description to a single line and exposes the full body via the row's
hover tooltip). The rest of the body documents what the webhook is wired to
and how the receiving expert should react. Use `webhook show <id>` to fetch
the full text — agents that have the webhook ID but not the full body should
call `show` rather than guessing from the truncated `list` summary. Update
the body with `webhook update <id> --description-file -` (reads from stdin)
or `--description "..."`.

In the bundle, reference the resulting webhook by ID:

```yaml
spec:
  triggers:
    - name: on-gitlab-mr
      type: webhook
      webhookId: <webhook-id-from-create>
      filter: '{"==": [{"var": "object_attributes.action"}, "open"]}'
```

> **⚠️ Known issue (as of 2026-05-04):** The server does not validate that
> `webhookId` refers to an existing webhook. `expert validate` and `expert
> apply` will both accept a non-existent or mistyped webhook ID without error.
> The trigger is created but will silently never fire. Always verify the
> webhook ID exists via `auggie cloud webhook show <id>` before referencing it
> in a bundle.

#### `autoCleanupOnIdle` (per-trigger auto-archive override)

Controls whether sessions created by this trigger auto-archive after going
idle. Default `true`. Set to `false` for triggers whose sessions are
long-running or revisitable (e.g. a PR-author session that keeps receiving
review comments). The field is exposed on all three configuration surfaces:
the CLI bundle (`spec.triggers[].autoCleanupOnIdle`), the webapp YAML
import/export, and the inline trigger editor's "Auto-archive sessions created
by this trigger" toggle. This per-trigger value takes precedence over the
expert's `session_config.auto_cleanup_on_idle`.

#### `perMinuteCreateAgentLimit` (per-trigger CreateAgent rate cap)

Optional non-negative integer on `spec.triggers[]` that caps how many sessions
this trigger may create per minute. A positive value sets the cap and is
always enforced; `0` clears a previously-set cap. When unset, the trigger
inherits the platform's default rate limit.



### JSONLogic Filters

Payload filters use [JSONLogic](https://jsonlogic.com/) syntax evaluated against
the raw webhook payload. Examples:

```json
// Match PRs opened
{"==": [{"var": "action"}, "opened"]}

// Match PRs opened in a specific repo
{"and": [
  {"==": [{"var": "action"}, "opened"]},
  {"==": [{"var": "repository.full_name"}, "org/repo"]}
]}

// Match PRs merged
{"and": [
  {"==": [{"var": "action"}, "closed"]},
  {"==": [{"var": "pull_request.merged"}, true]}
]}
```

**Supported operators.** Filters are evaluated by
[`diegoholiveira/jsonlogic/v3`](https://github.com/diegoholiveira/jsonlogic),
which defines the full operator set. Both creation-time validation
(`subscribe-event`, bundle apply) and runtime evaluation use the same
upstream allowlist, so anything the library accepts will work and anything
else is rejected. Commonly needed operators:

| Purpose | JSONLogic operator |
|---|---|
| Equality / inequality | `==`, `!=`, `===`, `!==` |
| Comparison | `<`, `<=`, `>`, `>=` |
| Boolean combinators | `and`, `or`, `!`, `!!` |
| Membership / substring | `in` (`["needle", "haystack"]` — array membership or string substring) |
| Field access | `var` (dotted path, e.g. `{"var": "pull_request.number"}`) |
| Array predicates | `some`, `all`, `none`, `filter`, `map` |
| Conditional | `if`, `?:` |

**`contains` is not a JSONLogic operator** and is rejected by validation —
the webapp filter builder's "contains" UI option compiles to `in`. Use
`{"in": ["substring", {"var": "field"}]}` for substring matches and the
same form for array membership.

### Iterating on Filters with Event Queries

Use `auggie cloud event list` to inspect captured webhook events and test filters:

```bash
# See recent GitHub events
auggie cloud event list --source github --since 2026-04-01

# Filter by event type
auggie cloud event list --source github --event-type pull_request

# Test a JSONLogic filter against captured events
auggie cloud event list --source github --payload-filter '{"==": [{"var": "action"}, "opened"]}'

# Inspect a single event with its full payload
auggie cloud event list --source github --event-type pull_request --limit 1 --verbose --format json
```

This is the recommended workflow: capture events first, inspect payloads, then
write and test filters before applying them to triggers.

### Setup Walkthrough

To wire an expert to fire on an external event end-to-end:

**Prerequisites** (one-time per tenant / expert):

- **The expert bundle exists.** Triggers live inside the bundle under
  `spec.triggers`; the `auggie cloud trigger` command exists for inspection and
  removal only (`list` / `get` / `delete`), not creation. If the expert isn't
  applied yet, `auggie cloud expert apply -f my-expert.yaml` first (without
  triggers, or with them — both work).
- **The matching integration is connected.** Confirm with
  `auggie cloud integration status`. GitHub triggers need the **GitHub App**
  integration installed on the relevant repos; Linear needs the **Linear App**;
  Slack needs the **Slack** app.
- **The expert has the matching capability** — a trigger that fires on
  `pull_request` is useless if the expert can't act back as the bot:

  | Trigger type | Capability the expert needs |
  |--------------|-----------------------------|
  | `github` | `GITHUB_APP` |
  | `linear` | `LINEAR_APP` |
  | `slack` | `SLACK` |
  | `pagerduty` | Whatever the work itself requires |
  | `scheduled` / `webhook` | Whatever the work itself requires |

**Steps:**

1. **Capture a real event and write the filter against it** — see
   [Iterating on Filters with Event Queries](#iterating-on-filters-with-event-queries).
2. **Add the trigger** under `spec.triggers` in the bundle (type, `eventType`
   if applicable, `filter`, and any type-specific fields like `cronExpression`
   or `pagerdutyRoutingKey`).
3. **Re-apply and verify:**

   ```bash
   auggie cloud expert validate -f my-expert.yaml   # parse + schema check
   auggie cloud expert apply -f my-expert.yaml      # create or update
   ```

   Then exercise the trigger end-to-end and confirm a session shows up in
   `auggie cloud session list`. If nothing fires, see
   [Trigger not firing](../operational-reference.md#trigger-not-firing).

> **Multi-expert workflows:** If the setup involves multiple experts (e.g. a
> triager + Pair Reviewer, or a PR author + poll worker), build and verify
> each expert individually before wiring them together. See
> [Self-Service → Build and Test One Expert at a Time](self-service.md#build-and-test-one-expert-at-a-time).

### Worked Examples

**Auto-review every new PR in one repo.** Start from
`expert-templates/pair-reviewer.yaml.template`, then add a trigger that
scopes to the repo and fires on the first "opened" event (use
`{"in": [{"var": "action"}, ["opened", "ready_for_review"]]}` if you also
want to fire when a draft PR is marked ready):

```yaml
spec:
  expert:
    # ... copy the body from pair-reviewer.yaml.template ...
  triggers:
    - name: review-opened-prs
      type: github
      eventType: pull_request
      filter: |
        {"and": [
          {"==": [{"var": "repository.full_name"}, "your-org/your-repo"]},
          {"==": [{"var": "action"}, "opened"]}
        ]}
```

**Scheduled status report.** `scheduled` triggers have no `eventType` and no
`filter`; they take a `cronExpression` plus an optional IANA `timezone`:

```yaml
spec:
  expert:
    # ... an expert that posts a Slack/GitHub status summary ...
  triggers:
    - name: weekday-morning-summary
      type: scheduled
      cronExpression: "0 9 * * MON-FRI"
      timezone: America/Los_Angeles
```

## Subscriptions (Agent-Created, Runtime)

Subscriptions are created **by agents at runtime** using the `subscribe-event`
tool. They deliver matching events as messages to the running agent session.

Agents use subscriptions for:
- Watching for PR comments, CI status changes, merges
- Scheduled polling (cron-based health checks)
- Reacting to Linear ticket updates
- Listening for Slack mentions

Subscriptions expire when the agent session ends. They support the same
sources and JSONLogic filters as triggers, but use **uppercase source names**
and a different JSON shape than the YAML trigger bundle. The platform
auto-normalizes lowercase source names (e.g. `github` → `GITHUB`), so either
case works in `subscribe-event` calls.

A typical PR-monitoring subscription bundle (one `subscribe-event` call with
multiple subscriptions):

```json
{
  "subscriptions": [
    {
      "source": "GITHUB",
      "event_type": "pull_request",
      "filter_payload": {"and": [
        {"==": [{"var": "repository.url"}, "https://api.github.com/repos/{owner}/{repo}"]},
        {"==": [{"var": "pull_request.number"}, 123]},
        {"==": [{"var": "action"}, "closed"]}
      ]},
      "description": "Watch for when the PR is closed or merged"
    },
    {
      "source": "GITHUB",
      "event_type": "issue_comment",
      "filter_payload": {"and": [
        {"==": [{"var": "repository.url"}, "https://api.github.com/repos/{owner}/{repo}"]},
        {"==": [{"var": "issue.number"}, 123]},
        {"==": [{"var": "action"}, "created"]}
      ]},
      "description": "Watch top-level comments"
    },
    {
      "source": "SCHEDULED",
      "description": "PR health check (every 30 minutes)",
      "cron_expression": "*/30 * * * *"
    }
  ]
}
```

Subscription field shape:

| Field | Notes |
|-------|-------|
| `source` | `GITHUB`, `LINEAR`, `SLACK`, `CUSTOM`, or `SCHEDULED` (uppercase). `CUSTOM` is the runtime source name for custom webhooks (the bundle trigger type is `webhook`). Which sources an agent is allowed to subscribe to is gated by its capabilities — `GITHUB_APP` → `GITHUB`, `LINEAR_APP` → `LINEAR`, `SLACK` → `SLACK`, `CUSTOM_WEBHOOK` → `CUSTOM`, and `SCHEDULED` is always available. |
| `description` | Free-text label; required, surfaces in `subscribe-event` listings |
| `event_type` | Optional for non-`SCHEDULED` sources. Empty means "match all" events for that source. For `GITHUB`/`LINEAR`/`SLACK` use the source's native event name (e.g. `pull_request`, `Issue`, `app_mention`). |
| `webhook_id` | Optional, only valid for `CUSTOM`. Set it to a custom webhook ID from `list-webhooks` to scope the runtime subscription to that webhook. Omit it for the legacy tenant-wide behavior: the subscription matches all custom webhook deliveries in the tenant. |
| `filter_payload` | JSONLogic expression as a JSON object (not a string) |
| `cron_expression` | Required for `SCHEDULED`; standard 5-field cron |
| `timezone` | Optional for `SCHEDULED`; IANA timezone name (e.g. `America/Los_Angeles`); defaults to UTC. DST-aware — schedules automatically adjust for daylight-saving transitions. |
| `max_fire_count` | Optional for `SCHEDULED`; `0` or omitted = unlimited |

> **Note:** `list-subscriptions` returns basic metadata (ID, source,
> description, event_type, and `webhook_id` for scoped `CUSTOM` subscriptions)
> but does **not** echo back schedule parameters
> (`cron_expression`, `timezone`, `max_fire_count`). Agents cannot verify
> schedule details after creation — keep track of them locally if needed.

> PagerDuty is wired for bundle triggers only. Runtime `subscribe-event` does **not** currently expose `PAGERDUTY` as a subscribable source (the `PAGERDUTY` capability registers the tool provider but is not plumbed into the tool's available-sources list). Use a bundle `type: pagerduty` trigger instead of a runtime subscription.

## Triggers vs. Subscriptions

| Aspect | Triggers | Subscriptions |
|--------|----------|---------------|
| Created by | Admin (CLI/webapp) | Agent (at runtime) |
| Lifetime | Persistent | Session-scoped |
| On match | Creates a new agent session | Sends message to existing session |
| Use case | "Start a PR reviewer when a PR is opened" | "Notify me when this specific PR gets a comment" |
