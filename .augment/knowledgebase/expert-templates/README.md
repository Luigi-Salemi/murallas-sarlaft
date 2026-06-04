# Expert Templates

Ready-to-use expert bundles. Each `.yaml.template` file is a complete `ExpertBundle`
that can be applied directly with `auggie cloud expert apply`.

## Templates

| File | Expert | What It Does | Model | Capabilities |
|------|--------|-------------|-------|-----------------|
| `advisor.yaml.template` | Cosmos Advisor | Helps a team continuously deploy and tune Cosmos agents and find what to automate next; lazy-includes `advisor/build-expert.md` to design bespoke experts inline when the catalog doesn't fit, and auto-captures reusable learnings to Advisor breadcrumbs. | `claude-opus-4-8` | `WEB_ACCESS`, `GITHUB`, `LINEAR`, `SLACK`, `GITHUB_APP`, `LINEAR_APP` |
| `pr-author.yaml.template` | PR Author (GitHub) | Creates, monitors, and maintains a GitHub PR end-to-end; reacts to CI failures and review comments and resolves merge conflicts, delegating periodic status polling to a lightweight worker. | `claude-opus-4-8` | `WEB_ACCESS`, `GITHUB_APP`, `LINEAR_APP` |
| `pr-author-status-watcher.yaml.template` | PR Author Status Watcher | Worker sub-agent for PR Author that polls PR state and SHA-specific CI subscriptions, reporting back only when action is needed (not launched standalone). | `claude-haiku-4-5` | `GITHUB_APP` |
| `mr-author.yaml.template` | MR Author (GitLab) | Creates, monitors, and maintains a GitLab MR end-to-end; reacts to pipeline failures and review notes and resolves merge conflicts, delegating periodic status polling to a lightweight worker. Requires the GitLab Cloud environment template. | `claude-opus-4-8` | `WEB_ACCESS`, `CUSTOM_WEBHOOK` |
| `mr-author-status-watcher-gitlab.yaml.template` | MR Author Status Watcher (GitLab) | Worker sub-agent for MR Author (GitLab) that polls MR state and SHA-specific pipeline events, reporting back only when action is needed (not launched standalone). | `claude-haiku-4-5` | `CUSTOM_WEBHOOK` |
| `pair-reviewer.yaml.template` | Pair Reviewer (GitHub) | Interactive intent-focused PR review where the agent leads each phase and the human is consulted between phases, with shared memory under `experts/code-review/`. | `claude-opus-4-8` | `WEB_ACCESS`, `GITHUB`, `GITHUB_APP` |
| `pr-risk-analyzer.yaml.template` | PR Risk Analyzer (GitHub) | Triggered when a PR opens or is marked ready for review, or on a `cosmos risk-analysis` PR comment, to decide between rubber-stamp approval and a focused Pair Review, passing review topics via a focused review link. | `claude-opus-4-8` | `WEB_ACCESS`, `GITHUB_APP` |
| `deep-code-reviewer.yaml.template` | Deep Code Reviewer | Non-interactive deep review that posts inline severity-tagged comments to GitHub (no human-in-the-loop). | `gpt-5-5` | `WEB_ACCESS`, `GITHUB_APP`, `LINEAR_APP`, `SLACK` |
| `mr-deep-code-reviewer.yaml.template` | Deep Code Reviewer (GitLab) | GitLab counterpart of Deep Code Reviewer: non-interactive line-by-line review that posts inline severity-tagged discussion notes to an MR (no human-in-the-loop). Requires the GitLab Cloud environment template. | `gpt-5-5` (backup `claude-opus-4-8`) | `WEB_ACCESS`, `CUSTOM_WEBHOOK` |
| `mr-risk-analyzer.yaml.template` | MR Risk Analyzer (GitLab) | GitLab counterpart of PR Risk Analyzer: triages an MR as rubber-stamp-safe (approve) or needing a focused Pair Review, passing review topics via a handoff link; re-analyzes on a `cosmos risk-analysis` MR note. Requires the GitLab Cloud environment template. | `claude-opus-4-8` | `WEB_ACCESS`, `CUSTOM_WEBHOOK` |
| `mr-pair-reviewer.yaml.template` | Pair Reviewer (GitLab) | GitLab counterpart of Pair Reviewer: interactive intent-focused MR review where the agent leads each phase and the human is consulted between phases, with shared memory under `experts/code-review/`. Requires the GitLab Cloud environment template. | `claude-opus-4-8` | `WEB_ACCESS`, `CUSTOM_WEBHOOK` |
| `code-review-memory-manager.yaml.template` | Code Review Memory Manager | Triggered on PR close/merge to own the team's per-repo memory by appending breadcrumbs and rewriting curated knowledge via the shared `curate-knowledge` skill. | `claude-opus-4-8` | `WEB_ACCESS`, `GITHUB_APP` |
| `feedback-triager.yaml.template` | Feedback Triager (Slack) | One-session-per-thread Feedback Triager flow; classification and ticket-creation steps left as `<TODO>` for the adopter. | `claude-opus-4-8` | `SLACK` (+ downstream ticket capability: `LINEAR_APP`, `GITHUB_APP`, …) |
| `incident-investigator.yaml.template` | Incident Investigator (Slack) | Single incident-response expert for both fixed alert channels and ad-hoc incident channels. Alert-thread mode watches configured alert channels for incident-management-platform alerts and top-level incident messages, posts root-cause analysis in-thread, subscribes to follow-ups, and gates code fixes on explicit human option-selection before launching PR Author. Stationed-channel mode launches manually from a Slack channel/message link or automatically via `channel_created`, watches every incident-like top-level message and engaged-thread follow-up in that channel, and stays stationed until a human types `stop`. In both modes, on resolution it posts an in-thread post-resolution summary and suggests a formal post-mortem write-up. Identity / incident-management platform / sibling-agents / alert channels / channels-already-covered / infrastructure context / service-routing / post-mortem-report format left as `<TODO>` for the adopter. | `claude-opus-4-8` | `WEB_ACCESS`, `SLACK`, `GITHUB_APP` |
| `end-to-end-verifier.yaml.template` | End-to-End Verifier | Single-shot e2e/integration verifier for a GitHub PR; triggered on PR creation, a `cosmos verify` comment, or a Slack @-mention with a PR URL, posts a fresh verdict comment per run, then terminates. | `claude-opus-4-8` | `WEB_ACCESS`, `GITHUB_APP`, `SLACK` |
| `personal-assistant.yaml.template` | Personal Assistant | User's persistent task tracker, agent dispatcher, and cross-session memory; reads/writes `tasks.md` in user-scoped VFS, dispatches any deployed expert as a worker, and DMs on Slack only after explicit per-category opt-in. | `claude-opus-4-8` | `WEB_ACCESS`, `GITHUB`, `LINEAR`, `GITHUB_APP`, `LINEAR_APP`, `SLACK` |
| `backlog-dispatcher.yaml.template` | Backlog Dispatcher | Scheduled triage agent that scans configured GitHub repos and Linear teams every 3 hours, applies a single judgement-based rubric, and either dispatches the `PR Author (GitHub)` expert as a worker (dispatch path, label `cosmos-dispatched`) or skips the ticket (skip path, label `cosmos-skipped`), with VFS-tracked per-PR state to cap concurrent open PRs (`MAX_OPEN_PRS`) and auto-close stale ones (`STALE_PR_DAYS`). | `claude-opus-4-8` | `WEB_ACCESS`, `GITHUB`, `GITHUB_APP`, `LINEAR_APP` |
| `cosmos-analyst.yaml.template` | Cosmos Analyst | Analyzes metrics of Cosmos usage and organization impact. | `claude-opus-4-8` | `GITHUB` |

### Environment Templates

| File | Environment | What It Does |
|------|-------------|-------------|
| `gitlab-cloud.yaml.template` + `gitlab-cloud-provision.sh` + `gitlab-cloud-vm-startup.sh` | GitLab Cloud | Reusable `EnvironmentBundle` that installs `glab` and clones/fetches GitLab repos at VM boot via `.netrc` using a token stored as secret `gitlab-token` (auto-installs as `$GITLAB_TOKEN`). Supports `gitlab.com` and self-hosted instances via `GITLAB_HOST`; repos are listed in `GITLAB_REPOS`. See `guides/cloud/gitlab-environment-setup.md`. <!-- pragma: allowlist secret --> |

## How to Use

### 1. Apply a template as-is

```bash
auggie cloud expert apply -f pr-author.yaml.template
```

### 2. Customize before applying

```bash
# Copy and edit
cp pr-author.yaml.template my-pr-author.yaml.template
# Edit my-pr-author.yaml.template (see customization points below)
auggie cloud expert apply -f my-pr-author.yaml.template
```

### 3. Validate without applying

```bash
auggie cloud expert validate -f pr-author.yaml.template
```

## Before Applying

These bundles are templatized — environment-specific values have been replaced
with `<PLACEHOLDER>` markers. You must fill them in before applying:

| Placeholder | Where | How to find the value |
|-------------|-------|-----------------------|
| `<ENVIRONMENT_ID>` | `spec.expert.environment.id` | `auggie cloud environment list` (no `--json`) |
| `<GITLAB_ENVIRONMENT_ID>` | `mr-author.yaml.template`, `mr-author-status-watcher-gitlab.yaml.template`, `mr-deep-code-reviewer.yaml.template`, `mr-risk-analyzer.yaml.template`, `mr-pair-reviewer.yaml.template` `spec.expert.environment.id` | Apply `gitlab-cloud.yaml.template`, rebuild it with `gitlab-cloud-provision.sh` and `gitlab-cloud-vm-startup.sh`, then copy the resulting environment ID. See `guides/cloud/gitlab-environment-setup.md`. |
| `<PR_AUTHOR_STATUS_WATCHER_EXPERT_ID>` | `pr-author.yaml.template` `workerExpertIds` | See `pr-author-status-watcher.yaml.template` onboarding header |
| `<MR_AUTHOR_STATUS_WATCHER_EXPERT_ID>` | `mr-author.yaml.template` `workerExpertIds` | See `mr-author-status-watcher-gitlab.yaml.template` onboarding header |
| `<PAIR_REVIEWER_EXPERT_ID>` | `pr-risk-analyzer.yaml.template` system prompt — Pair Reviewer handoff configuration | See `pair-reviewer.yaml.template` onboarding header |
| `<PAIR_REVIEWER_GITLAB_EXPERT_ID>` | `mr-risk-analyzer.yaml.template` system prompt — Pair Reviewer handoff configuration | See `mr-pair-reviewer.yaml.template` onboarding header |
| `<GROUP>/<PROJECT_NAME>`, `path/to/...` | `mr-risk-analyzer.yaml.template` opted-out repos / sub-directories list | Edit the system prompt to match your org's sensitive areas before applying |
| `<OWNER/REPO>` | GitHub `pull_request` and `issue_comment` trigger filters | Default: replace with the exact repository full name, for example `augmentcode/augment`. The clause is an `in` check against a JSON list, so you can also extend it to several repos (`["org/repo-a", "org/repo-b"]`); to intentionally run across every installed repository, drop the `{"in": [{"var": "repository.full_name"}, ["<OWNER/REPO>"]]}` clause entirely. |
| `<OWNER>/<REPO_NAME>`, `path/to/...` | `pr-risk-analyzer.yaml.template` opted-out repos / sub-directories list | Edit the system prompt to match your org's sensitive areas before applying |
| `<CHANNEL_ID>` | `end-to-end-verifier.yaml.template` `slack-app-mention` trigger filter | Slack channel where the bot accepts @-mentions carrying a GitHub PR URL. **Delete the entire `slack-app-mention` trigger** if GitHub is the only entry point — do not ship the literal placeholder. |
| `<PR_AUTHOR_EXPERT_ID>` | `backlog-dispatcher.yaml.template` `workerExpertIds` | Apply `pr-author.yaml.template` first, then look up its ID (`auggie cloud expert list --json \| jq -r '.[] \| select(.config.displayName == "PR Author (GitHub)") \| .expertId'`) |
| `<GITHUB_USERNAME>`, `<GITHUB_REPOS>`, `<LINEAR_TEAM_KEYS>` | `backlog-dispatcher.yaml.template` system prompt | Edit before applying — the operator's GitHub handle (used in failure comments) and the repos / Linear team keys to scan |
| `MAX_OPEN_PRS`, `STALE_PR_DAYS`, `PR_REGISTRY_PATH` | `backlog-dispatcher.yaml.template` system prompt | Backpressure cap (default `10`), stale-PR close threshold in days (default `7`), and VFS directory for the PR registry (default `tenant/experts/backlog-dispatcher/state/prs/`, matching the tenant-scoped default; switch the prefix to `user/...` if you flip visibility to `user` for personal/dev use) |
| `<BOT_USER_ID>`, `<INCIDENT_PLATFORM_BOT_USER_ID>`, `<SIBLING_BOT_USER_IDS>` | `incident-investigator.yaml.template` system prompt + trigger / subscribe filters | Slack user id this expert posts as (used for self-detection and to skip self in subscription filters), the incident-management-platform's Slack bot user id (e.g. PagerDuty / Opsgenie / Datadog — used to recognise platform-authored alerts and resolution updates), and a JSON array of any sibling AI agent bot user ids whose messages must be filtered out (`[]` if none). Look up bot user ids via `users.lookupByEmail` or `users.list`. |
| `<ALERT_CHANNEL_ID>`, `<ALERT_CHANNEL_NAME>` | `incident-investigator.yaml.template` trigger filters + system prompt | The Slack channel this bundle watches. Duplicate the engage trigger per channel to fan an investigator out across multiple channels. |
| incident-management platform, available skills, infrastructure context, service/signal routing table | `incident-investigator.yaml.template` inline system prompt blocks | Fill in the platform name (PagerDuty, Opsgenie, Datadog, …) and its incident-URL shape / resolution keywords / urgency-to-priority mapping in the *Incident-management platform* block; the metrics-query and log-query skills wired into your runtime; runtime contexts/namespaces, structured-log field reliability, canonical metric names, evidence-link templates; and the service/signal → handoff-channel routing table for your org before applying. |
| `<PR_AUTHOR_EXPERT_ID>` | `incident-investigator.yaml.template` `workerExpertIds` | Apply `pr-author.yaml.template` first, then look up its ID (same lookup as for `backlog-dispatcher.yaml.template`). |
| post-mortem report format | `incident-investigator.yaml.template` inline system prompt blocks | The *Post-mortem report* block's *Report format* is optional and takes a plain-text / code section outline (this agent cannot open external doc tools, so do not link a Notion / Linear / Google Doc template); leave it blank to let Phase 5b fall back to its default five-section format. |
| `channel_created` trigger | `incident-investigator.yaml.template` `triggers` section | **Enabled by default** — auto-launches stationed-channel mode for every new channel whose name contains `inc_` or `incident`. To restrict to manual launches only, comment the trigger block out or set `enabled: false`. See the trigger's inline comments for the naming-convention check (consider tightening to `inc-` to avoid catching discussion channels like `general-incidents`) and the auto-invite requirement for private channels. |

The `<OWNER/REPO>` scope is the default because the Augment GitHub App delivers webhooks for every repository where the app is installed. An unscoped GitHub trigger can fan out across an entire organization instead of running only for the intended project. Leaving the placeholder unsubstituted fails closed (no repository will match the literal string `<OWNER/REPO>`); extending the list to several repositories is the supported way to run on a curated set, and removing the scope clause altogether is the explicit opt-in to org-wide fan-out.

Server-managed fields are intentionally omitted from these templates and will be
populated automatically:

- **`spec.expert.id`** — assigned by the server on create
- **`metadata.resourceVersion`** — server-managed; omit on create, the server
  will return the current value on update
- **`spec.expert.workerExpertIds`** — empty except in `pr-author.yaml.template` which references the PR Author Status Watcher worker

## Customization Points

### Model

Change `spec.expert.model` to use a different model:
```yaml
spec:
  expert:
    model: claude-opus-4-8    # or claude-opus-4-7, etc.
```

### System Prompt

Each template's `spec.expert.systemPrompt` starts with an `<include>` that loads
the shared prompt from `expert-templates/prompts/<template-name>.md`. Most
templates use only that include. When an adopting bundle must customize prompt
text before applying (for example repo allowlists or Slack channel taxonomy),
that customer-specific text lives inline in the template's `systemPrompt` after
the `<include>` — never in `prompts/*.md`. Edit those inline sections to match
your team's conventions:
- Repository naming, branching conventions
- PR description templates
- Review standards and severity definitions
- CI/CD pipeline details

Treat `prompts/*.md` as shared canonical prompt bodies. Changes there flow to
customers who keep the include, so keep customer-owned placeholders in the YAML
template instead of the shared prompt file.

`spec.expert.includeDefaultSystemPrompt: true` keeps the platform's default
system prompt active in addition to your custom one — leave this on unless you
have a strong reason to start from scratch.

### User Instructions and Placeholder Text

Use `spec.expert.userInstructions` for Markdown guidance shown to users before
they launch the expert. Use optional `spec.expert.placeholderText` to customize the
home-page chat composer placeholder when this expert is selected. Omit
`placeholderText` (or leave it empty) to use the product default.

### Capabilities

Capabilities are in `spec.expert.capabilities` as a list of string names:

```yaml
spec:
  expert:
    capabilities:
      - WEB_ACCESS
      - GITHUB_APP
      - LINEAR_APP
```

| Name | Description |
|------|-------------|
| `WEB_ACCESS` | Web search and fetch |
| `GITHUB` | GitHub API using the user's personal OAuth token |
| `LINEAR` | Linear API using the user's personal OAuth token |
| `SLACK` | Slack API using the tenant Slack bot |
| `GITHUB_APP` | GitHub API using the org-level GitHub App (bot identity) — required for automation triggered by GitHub webhooks |
| `LINEAR_APP` | Linear API using team-level OAuth (bot identity) — required for automation triggered by Linear webhooks |

`CLI_TOOLS` is deprecated as a bundle capability. Auggie sessions already run
with filesystem and terminal tools through their agent process; keep accepting
the old value for imported bundles, but do not add it to new templates.

**`GITHUB` vs `GITHUB_APP`:** Use `GITHUB` when the agent should act as the
human user driving the session. Use `GITHUB_APP` for automation: actions appear
as the Augment bot and the agent can subscribe to and receive GitHub webhooks.
The same distinction applies to `LINEAR` vs `LINEAR_APP`.

### Environment / VM Resources

```yaml
spec:
  expert:
    environment:
      id: <ENVIRONMENT_ID>
      resources:
        cpuCores: 2       # 2-8
        memoryMib: 4096   # 4096-16384
```

Default to 2 CPU / 4 GiB for most experts, and bump to 4 CPU / 8 GiB for
experts that run heavy builds or deployments. The `resources` block is
optional — omit it to use the environment's defaults.

### Visibility

```yaml
visibility: tenant    # shared with team
visibility: user      # private to creator
```

### Hiding an expert from the Home launcher

```yaml
spec:
  expert:
    hidden: true
```

Set `hidden: true` for worker-only or auto-triggered experts that should not
appear in the webapp `/home` Expert grid. Hidden experts are still fully
usable: invocable by ID or deep link, launchable as a worker (`worker-launch`),
and triggerable by webhooks/cron. The three templates that ship with `hidden:
true` — `pr-author-status-watcher`, `pr-risk-analyzer`, and
`code-review-memory-manager` — are all examples of this pattern.
Omitted/`false` means visible.

## Adding Triggers

Triggers auto-launch an expert when an event matches. Add them to the bundle
under `spec.triggers` (the trigger is automatically tied to the expert in the
same bundle, so there is no `expertId` field):

```yaml
spec:
  expert: { ... }
  triggers:
    - name: on-pr-opened
      type: github
      eventType: pull_request
      filter: '{"==": [{"var": "action"}, "opened"]}'
```

Trigger fields:

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | Unique within the bundle |
| `type` | yes | One of `github`, `linear`, `slack`, `pagerduty`, `webhook`, `scheduled` |
| `eventType` | for `github`/`linear`/`slack` | e.g. `pull_request`, `issue_comment`, `Issue`, `Comment`, `app_mention` |
| `filter` | no | JSONLogic expression evaluated against the webhook payload |
| `cronExpression` | for `scheduled` | Standard 5-field cron, e.g. `0 9 * * MON-FRI` |
| `timezone` | no | For `scheduled`, e.g. `America/Los_Angeles` (defaults to UTC) |
| `webhookId` | for `webhook` | Custom webhook ID, created via the webapp `/webhooks` page (`poseidon_webhooks_enabled`) or the `auggie cloud webhook create --type bearer\|gitlab\|jira` CLI subcommand. See `guides/cloud/automations.md` § Custom Webhooks. |
| `pagerdutyRoutingKey` | for `pagerduty` | PagerDuty integration routing key. `pagerduty` triggers do **not** use `eventType` — match specific actions with `filter` on `event.event_type` / `event.data.*` instead. |
| `enabled` | no | Set to `false` to keep the trigger in the bundle but stop it from firing |

Common GitHub `filter` patterns (apply to `eventType: pull_request` unless noted):

| Event | Filter |
|-------|--------|
| PR opened | `{"==": [{"var": "action"}, "opened"]}` |
| PR ready for review | `{"==": [{"var": "action"}, "ready_for_review"]}` |
| PR merged | `{"and": [{"==": [{"var": "action"}, "closed"]}, {"==": [{"var": "pull_request.merged"}, true]}]}` |
| Specific repo only | Add `{"==": [{"var": "repository.full_name"}, "org/repo"]}` to an `and` filter |
| Comment on a PR | Use `eventType: issue_comment` with filter `{"!=": [{"var": "issue.pull_request"}, null]}` |
