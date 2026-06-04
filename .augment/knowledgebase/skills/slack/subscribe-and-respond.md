---
name: slack-subscribe-and-respond
description: In-thread follow-up subscription for any Slack-posting agent — single `subscribe-event` call (no text filter, skip the agent's own bot user) so every reply on the thread the agent has posted to wakes the session, plus the local decide-respond rule (mention or directed follow-up question → respond, with a `:eyes:` reaction on the incoming reply before any other work and removed after the response posts; aside between humans / reaction-only ack → stay quiet) and a never-terminate rule that keeps the session-scoped subscription alive.
---

Once you have posted into a Slack thread and want future replies on that thread to wake this session, call `subscribe-event` **once** so every in-thread reply is delivered. The subscription is session-scoped; if the session ends or is archived, it will not fire.

## Subscribe to all in-thread messages (no text filter)

Filtering on text content (`cosmos`, `<@bot-id>`, etc.) is fragile — casing, formatting, leading/trailing characters, and Slack delivery shape vary, and a missed match silently drops the reply. It is cheaper to receive every in-thread reply and decide locally whether to respond than to debug a filter that drops one.

Call shape:

```
subscribe-event(
  source = "SLACK",
  event_type = "message",
  description = "in-thread follow-ups for <ts> in <channel>",
  filter_payload = {
    "and": [
      {"==": [{"var": "event.type"}, "message"]},
      {"==": [{"var": "event.channel"}, "<TRIGGERING_CHANNEL_ID>"]},
      {"==": [{"var": "event.thread_ts"}, "<TRIGGERING_THREAD_TS>"]},
      {"!=": [{"var": "event.user"}, "<BOT_USER_ID>"]}
    ]
  }
)
```

`<TRIGGERING_CHANNEL_ID>` and `<TRIGGERING_THREAD_TS>` are the values from the event that invoked you (use `event.thread_ts` when present, otherwise `event.ts` — the same value you used for `thread_ts` when posting). `<BOT_USER_ID>` is your own bot user id, named in the adopting bundle's identity block; skipping it ensures your own posts never re-trigger the session.

Before subscribing, call `list-subscriptions` and skip the call if a subscription with the same channel + thread_ts already exists. Never subscribe more than once per thread — duplicate subscriptions cause every in-thread reply to wake the session multiple times.

## Decide locally whether to respond

When a subscribed reply arrives, decide locally whether it is directed at you.

**Respond** when the reply:

- mentions you (any of `<@<BOT_USER_ID>>`, the bot's display handle, or the bot's name with or without the `@` prefix); OR
- asks a follow-up question or issues a directive about your prior post or the topic of the thread (e.g. "make the PR", "what about X", "can you check Y", "wrong, it's actually Z").

**Stay quiet** (do not post anything) when the reply is:

- a human aside between teammates that is not addressed to you (e.g. "thanks", "fyi @alice", "I'm on it");
- a reaction-only or trivial ack with no question or directive.

Automated status updates from other bots in the channel (deploy / CI / monitoring notifications, the triggering integration's own escalation or acknowledgement messages, etc.) do not match the *respond* criteria above and so default to staying quiet — no separate rule needed. If a composing expert wants to *act* on a specific bot message in-thread, it must say so explicitly in its own prompt.

When you do respond, the very first thing you do — before any analysis, tool calls, or codebase reads — is add a `:eyes:` reaction to the incoming reply so the channel knows you have picked it up. Investigation or drafting the reply can take several minutes; without this ack, humans cannot tell whether the agent received the follow-up.

```
reactions.add(channel: <event.channel>, name: "eyes", timestamp: <event.ts>)
```

`<event.ts>` is the timestamp of the *incoming reply*, not the thread root. If `reactions.add` errors, log and proceed — the visible reply is what users actually care about.

Then treat the reply body as a free-form instruction in the same thread context and answer in-thread following the composing expert's posting rules (sections + blank lines per the Slack mrkdwn-formatting skill). Do not re-post your prior analysis; answer the question or take the next action.

Once your response `chat.postMessage` has returned, remove the `:eyes:` reaction so the channel can distinguish "still working" from "done answering". Without this step, stale `:eyes:` accumulates on every reply you have already answered and humans cannot read the channel's state.

```
reactions.remove(channel: <event.channel>, name: "eyes", timestamp: <event.ts>)
```

`<event.ts>` is again the timestamp of the *incoming reply* (the same value passed to `reactions.add`), not the response you just posted. If `reactions.remove` errors (already removed, missing, etc.), log and proceed.

## Never terminate this session

The subscription above is session-scoped: `terminate-session` cancels it and future replies silently drop. Once subscribed, never call `terminate-session` and never unsubscribe. Any "done" / "stop" / "nothing to do" signal from the composing expert means end the turn, not end the session.
