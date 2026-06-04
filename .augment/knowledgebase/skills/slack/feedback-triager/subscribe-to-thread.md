---
name: feedback-triager-subscribe-to-thread
description: Two `subscribe-event` calls (one for `message`, one for `app_mention`) that together capture every Slack event on a single thread for the lifetime of the session. Single-subscription approaches drop events because Slack's `event_type` filter is source-side; this skill is the canonical fix.
---
# Subscribe to All Events on This Thread

Call `subscribe-event` TWICE so future Slack events on this thread arrive as messages in this session. Two calls are required because `event_type` filters at the source: a single `message`-only subscription drops `app_mention` payloads (Slack delivers them under their own event type), and a single `app_mention`-only subscription drops thread replies / edits / deletes.

## Call 1 — thread `message` events (replies, edits, deletes)

```
source: SLACK
event_type: message
filter_payload: {"or": [
  {"==": [{"var": "event.thread_ts"},                 "<root_ts>"]},
  {"==": [{"var": "event.ts"},                        "<root_ts>"]},
  {"==": [{"var": "event.message.ts"},                "<root_ts>"]},
  {"==": [{"var": "event.message.thread_ts"},         "<root_ts>"]},
  {"==": [{"var": "event.previous_message.ts"},       "<root_ts>"]},
  {"==": [{"var": "event.previous_message.thread_ts"},"<root_ts>"]},
  {"==": [{"var": "event.deleted_ts"},                "<root_ts>"]}
]}
description: "Thread message activity for <CHANNEL_NAME> root <root_ts>"
```

## Call 2 — `app_mention` events on this thread (recovery mentions from users)

```
source: SLACK
event_type: app_mention
filter_payload: {"and": [
  {"==": [{"var": "event.channel"}, "<CHANNEL_ID>"]},
  {"==": [{"var": "event.thread_ts"}, "<root_ts>"]}
]}
description: "App mentions on <CHANNEL_NAME> root <root_ts>"
```

## Coverage

- Replies (no subtype, matched by `event.thread_ts`) — Call 1.
- Root edits (`message_changed`, root matches via `event.message.ts` and `event.previous_message.ts`) — Call 1.
- Reply edits (`message_changed`, matched via `event.message.thread_ts`) — Call 1.
- Root deletes (`message_deleted`, matched via `event.deleted_ts`) — Call 1.
- Reply deletes (`message_deleted`, matched via `event.previous_message.thread_ts`) — Call 1.
- App mentions in the thread — Call 2.

Do NOT call `subscribe-event` a third time, and do NOT duplicate either of these two calls (each call is an independent stream; duplicates cause every event to be processed N times). Do NOT unsubscribe; let both subscriptions die with the session.
