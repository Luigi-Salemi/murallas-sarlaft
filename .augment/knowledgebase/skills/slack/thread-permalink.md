---
name: slack-thread-permalink
description: Construct a Slack permalink to a thread root message deterministically from the channel ID and message ts, without a `chat.getPermalink` round-trip. Used by Slack-posting agents that need to embed a link to a thread in a downstream system (ticket description, comment, log).
---
# Slack Thread Permalink

A Slack permalink to a thread root message has the shape:

```
https://<workspace>.slack.com/archives/<CHANNEL_ID>/p<ts_no_dot>
```

- `<workspace>` — the workspace's canonical Slack subdomain. The calling expert hardcodes this in its context block; do NOT look it up per event.
- `<CHANNEL_ID>` — the channel ID from the Slack event (`event.channel`).
- `<ts_no_dot>` — the message `ts` with the dot removed. Example: `1730412345.678901` → `p1730412345678901`.

Construct the URL deterministically rather than calling `chat.getPermalink`; it saves a Slack round-trip per posted ticket and per thread update.
