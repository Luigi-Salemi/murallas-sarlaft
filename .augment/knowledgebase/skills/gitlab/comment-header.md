---
name: gitlab-comment-header
description: Required header format for GitLab notes posted by an Augment agent. Refers to role name, emoji, session URL, and on-behalf-of identity defined in the expert's context block.
---
# Comment Header

Every note posted by this agent must begin with the header below. Take `ROLE_NAME`, `EMOJI`, and `ON_BEHALF_OF` from your expert context, and `SESSION_URL` from `session-metadata.md`:

```
<sup>[**ROLE_NAME**](SESSION_URL)EMOJI on behalf of @ON_BEHALF_OF</sup>
```

If your expert context omits `ON_BEHALF_OF` (or sets it to empty / `none`) — typical for centralized automations that do not act for a specific human — drop the trailing ` on behalf of @ON_BEHALF_OF` clause and use:

```
<sup>[**ROLE_NAME**](SESSION_URL)EMOJI</sup>
```

- `ROLE_NAME` — the role string given in your context (for example, `MR Author Agent`).
- `SESSION_URL` — your session URL, read from `session-metadata.md`.
- `EMOJI` — the emoji given in your context.
- `ON_BEHALF_OF` — only present when this expert is acting on a specific human's behalf. Use that human's GitLab handle without the leading `@`.

The header line is required on every note this agent posts (top-level discussion notes and inline diff notes alike).
