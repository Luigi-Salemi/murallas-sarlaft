---
name: github-pr-monitor-attribution
description: Identity-attribution rules for a GitHub PR-monitoring agent. Tool selection and visible identity depend on the session classification — manual sessions use `github-api` (the human's OAuth identity); delegated sessions use `github-app-api` (the org bot). Used by PR Author and any other expert that opens or operates on GitHub PRs.
---
# Attribution

Identity on every PR surface depends on the session classification (defined at the bottom of this file). In a **manual** session the agent acts as the human who launched it; in a **delegated** session the agent acts as the org bot.

| Surface | Manual session | Delegated session |
|---|---|---|
| Tool for all platform operations | `github-api` (the human's OAuth identity) | `github-app-api` (the org bot identity) |
| PR API call (visible creator) | the human | the bot |
| PR body `**Author:**` line | omit | omit |
| PR body `Requested by` line | omit — the human is already the creator | per "Requested by" resolution below — always present when a requester can be resolved |
| Self-assign the PR | assign `github_username` from `session-metadata.md` — GitHub's `assignees` field is distinct from the creator field and is what surfaces the PR in the human's "Assigned" view and notification stream | assign whenever the requester resolves to a known GitHub login: **delegated session with `requested_by_link` host = `github.com`** (GitHub-Issue path through the dispatcher) → assign the login from `requested_by_name` (strip the leading `@`). All other delegated cases (Slack, Linear, generic) → leave unassigned: no reliable GitHub identity is available, and `session-metadata.md`'s `github_username` in those cases names the expert owner, not the requester |
| Comment-header `on behalf of @…` clause | omit — the GitHub avatar is already the human; use the no-clause form from `comment-header.md` | omit — centralized automation; use the no-clause form from `comment-header.md` |
| Branch-name prefix | `<github_username>/<short-description>` (`github_username` from `session-metadata.md`) | `bot/<short-description>` |
| Git commit author (`user.name` / `user.email`) | set from `session-metadata.md` (`github_username` and `user_email`) via `git config` before the first commit | inherit the worker VM's git config — known gap: the bot identity is not discoverable from inside the session (the bot-auth tool cannot reach `/user` or `/app`), so commit metadata shows the operator |

Never mix the two tools in the same session — the chosen tool from the row above is the only one used for the full PR lifecycle.

If the session is manual per the classification below but `github_username` is missing from `session-metadata.md`, fall back to the **delegated session** column across the entire table and note the missing field in the PR description so the operator can fix the Cosmos misconfiguration.

In delegated sessions, prefer the payload's attribution fields over `session-metadata.md` — in worker launches that file names the expert owner, not the requester.

## "Requested by" resolution

Only applies to **delegated** sessions — manual sessions omit the line because the human is already the creator. Pick the first source that yields a name:

1. **Delegated payload** — the incoming worker message (e.g. `<manager>`-wrapped first message, dispatcher launch, Slack triage launch) carries `requested_by_name` and optionally `requested_by_link`:
   - both present → `Requested by: [<name>](<link>)`
   - `requested_by_name` only → `Requested by: <name>`
2. **Neither available** — omit the line and continue. This is rare and means a delegated launch failed to supply the field; do not invent a requester.

## Session classification

A session is **manual** only when ALL of the following hold:

- The first message has no `<manager>` wrapper.
- The first message has no `SOURCE:` header on its own line at the start. A `SOURCE:` substring embedded in prose, a quoted log line, or a code block does not count — only a true header line.
- The first message is not a delegated payload from another expert.

Anything else is a **delegated** session. When in doubt, treat as delegated — use `github-app-api`, leave the PR unassigned, and rely on the delegated payload for the `Requested by` line.
