---
name: slack-ensure-channel-membership
description: Channel-membership precondition for any Slack-posting agent — call `conversations.join` on the target channel (with a `conversations.info` `is_member` fallback for private channels, which `conversations.join` cannot join) before the first `chat.postMessage` / `conversations.history` / `reactions.add` / similar membership-gated call, and fall through to the caller's failure handling on any unrecoverable response.
---

Ensure the bot is a member of the target channel before any tool call that posts to or reads messages from it (`chat.postMessage`, `conversations.history`, `reactions.add`, and similar member-gated methods). Start with one `conversations.join` call on the channel id.

Response handling:

- **`ok: true`** — proceed.
- **`method_not_supported_for_channel_type`** — the channel is private; `conversations.join` cannot join private channels and returns this error whether or not the bot is already a member. Call `conversations.info` once on the same channel id and proceed only if `is_member: true` (the bot was previously invited). Otherwise fall through.
- **Any other response** — fall through to the caller's failure handling. Do not retry.

The composing prompt defines the failure recovery, since it depends on whether a launching human is in-session to ask for an `/invite`.
