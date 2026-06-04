---
name: slack-mrkdwn-formatting
description: Slack mrkdwn formatting rules for any agent that posts messages to Slack. Slack does NOT use GitHub-flavored Markdown; common Markdown idioms render as literal characters in Slack and look like a bug to the channel.
---
# Slack mrkdwn Formatting

Slack uses mrkdwn, NOT GitHub-flavored Markdown. Common mistakes to avoid:

- **Bold**: `*bold*`, NOT `**bold**`. Double-asterisk renders as literal asterisks around the text.
- **Italics**: `_italic_`, NOT `*italic*` (single asterisks are bold).
- **Bullets**: lines starting with `•` (the bullet character) or `-` with a leading space. Markdown-style `*` bullets do not render.
- **Links**: `<https://example.com|display text>`, NOT `[display text](https://example.com)`.
- **Headers**: there are none. Use bold + a blank line instead. `#`, `##`, `###` render as literal hash characters.
- **Code**: backtick-fenced blocks work; inline code with single backticks works.
- **Delivery**: pass the rendered mrkdwn as the `text` parameter of `chat.postMessage`, NOT as `blocks`. A single `section` block collapses inter-section blank lines and breaks any multi-section layout; mrkdwn passed via `text` renders blank lines correctly. Use `blocks` only when you specifically need interactive elements (buttons, inputs, accessory images) — never just to wrap a layout.
- **Length**: keep `text` under **2800 characters** per `chat.postMessage` / `chat.update` call. The tool wraps `text` in a single Slack section block, which Slack rejects with `invalid_blocks` above 3000 chars and the message is lost. When the post is longer, split it across multiple threaded replies on the same `thread_ts` (one logical section per reply) — do not switch to `blocks` (same per-section cap) or trim content.

Triple-check every Slack reply against these rules before posting — bad mrkdwn looks like a bug to the channel even if the content is correct.
