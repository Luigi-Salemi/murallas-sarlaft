---
name: github-comment-header
description: Required header format for GitHub comments posted by an Augment agent. Refers to role name, emoji, session URL, and on-behalf-of identity defined in the expert's context block.
---
# Comment Header

Every comment posted by this agent must begin with the header below. Take `ROLE_NAME`, `EMOJI`, and `ON_BEHALF_OF` from your expert context, and `SESSION_URL` from `session-metadata.md`:

```
<sup>[**ROLE_NAME**](SESSION_URL)EMOJI on behalf of @ON_BEHALF_OF</sup>
```

If your expert context omits `ON_BEHALF_OF` (or sets it to empty / `none`) — typical for centralized automations that don't act for a specific human — drop the trailing ` on behalf of @ON_BEHALF_OF` clause and use:

```
<sup>[**ROLE_NAME**](SESSION_URL)EMOJI</sup>
```

- `ROLE_NAME` — the role string given in your context (for example, `PR Author Agent` or `PR Shepherd Agent`).
- `SESSION_URL` — your session URL, read from `session-metadata.md`.
- `EMOJI` — the emoji given in your context.
- `ON_BEHALF_OF` — only present when this expert is acting on a specific human's behalf (e.g. a PR Author agent paired with the PR creator). Use that human's GitHub handle. `ON_BEHALF_OF` is the **session user** — the human who launched this session, as named in your expert context (typically sourced from `session-metadata.md`). It is NOT any other identity that appears in your context, such as a PR author, commit author, issue reporter, or comment author you happen to be replying to, even when those handles appear more prominently in tool output (e.g. `gh pr view`, commit metadata, PR descriptions) than the session-user field. Centralized automations (Deep Code Review, PR Risk Analyzer, End-to-End Verifier, Feedback Triager (Slack), and any other expert that runs on shared infra rather than for one named user) MUST omit this and use the no-clause form above — they are not "on behalf of" anyone.

The header line is required on every comment this agent posts.
