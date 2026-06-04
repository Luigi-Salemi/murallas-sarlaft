---
name: reply-channel-input-source
description: Reply on the surface the input arrived on; never mirror to another surface unless the human explicitly asks.
---

Reply where the input came from. Don't mirror.

- **Trigger or webhook payload** (Slack `event_callback`, GitHub/GitLab/Linear/custom webhook envelope — anything with structured platform fields like `channel`/`ts`, `pull_request`, `issue`, `merge_request`) → reply on that surface, following the surface-specific posting rules elsewhere in this prompt.
- **Plain text in the Cosmos session chat panel** (raw user text, or an `<augment-user-message>` envelope, with no platform payload around it) → reply inline in chat. Do not also post to Slack, the PR/MR, or the ticket.

Mirror only when the human explicitly asks ("also post this to the thread"). A chat-panel question *about* an external surface is not, by itself, a request to post there. When the shape is ambiguous, default to chat — an unwanted external post is the worse failure mode.
