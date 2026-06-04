# Capabilities and Integrations

## Capabilities

Capabilities are the tools and integrations available to an agent. They come in
two flavors:

### Builtin Capabilities

Added via `spec.expert.capabilities` in the expert bundle as a list of string
names:

```yaml
spec:
  expert:
    capabilities:
      - WEB_ACCESS
      - GITHUB_APP
      - LINEAR_APP
```

Current capabilities:

| Capability | Description |
|-----------|-------------|
| `WEB_ACCESS` | Web search and web fetch tools |
| `GITHUB` | GitHub API using user's OAuth token — acts as the user |
| `GITHUB_APP` | GitHub API using org-level GitHub App — acts as bot, can receive webhooks |
| `LINEAR` | Linear API using user's OAuth token — acts as the user |
| `LINEAR_APP` | Linear API using team-level OAuth — acts as bot, can receive webhooks |
| `SLACK` | Slack API using tenant's bot token |
| `CUSTOM_WEBHOOK` | `list-webhooks` tool and `CUSTOM` event subscriptions |

`CLI_TOOLS` is deprecated as a capability marker. Auggie sessions already have
filesystem and terminal tools through their running agent process; existing
bundles that mention `CLI_TOOLS` continue to import for compatibility, but new
experts should omit it.

> Some capabilities that exist in the platform (e.g., for internal GCP/Kubernetes/PagerDuty tooling) are not user-configurable via `spec.expert.capabilities` and are omitted from this list. If you need one, ask an admin — they are granted out-of-band, not via the expert YAML. The `ECHO` builtin capability is a test-only echo tool; do not add it to production experts.

### OAuth vs. App (GitHub, Linear)

Two patterns for external service access:

| Aspect | Personal (OAuth) | App |
|--------|------------------|-----|
| Capability | `GITHUB` / `LINEAR` | `GITHUB_APP` / `LINEAR_APP` |
| Identity | Acts as the user | Acts as a bot/app |
| Webhook events | Cannot subscribe | Can subscribe |
| Setup | User connects from `/my-settings/integrations/github` or `/my-settings/integrations/linear` | Admin connects from `/integrations` |
| Use case | Personal PRs, reviews | Automated workflows, triggers |

**Rule of thumb:** Use `GITHUB` for interactive sessions where actions should
appear as the user. Use `GITHUB_APP` for automated/triggered workflows where
actions should appear as the Augment bot and webhooks are needed.

## Integrations

Integrations connect external services to Cosmos.

### Setup boundary

For setup requests, send users to the web UI first: `/integrations` for team
installs (GitHub App, Linear App, Slack), `/my-settings/integrations/github` for
personal GitHub OAuth, or `/my-settings/integrations/linear` for personal Linear
OAuth.

The relevant human must finish the browser flow: user-scoped integrations need
that user; app / workspace integrations need an org, workspace, or app admin.
Afterward, verify with `auggie cloud integration status`. Do not imply an agent
can complete OAuth inside its cloud VM.

Slack caveat: the workspace must be eligible, the installer needs Slack admin
permission. If the web UI flow fails, stop retrying and ask the workspace admin
or support to help.

### Available Integrations

| ID | Type | Scope |
|----|------|-------|
| `github-user` | GitHub Personal OAuth | Per-user |
| `github-app` | GitHub App | Per-org/tenant |
| `linear-user` | Linear Personal OAuth | Per-user |
| `linear-app` | Linear App OAuth | Per-tenant |
| `slack-team` | Slack Bot | Per-tenant |
