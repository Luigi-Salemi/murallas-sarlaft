---
name: incident-investigator-triage
description: Phase 1 triage for the Incident Investigator (Slack) — decide whether to engage, capture the triggering thread, post the single-line `:mag: investigating` ack, parse the input into a structured incident summary, and dedup against the agent's own prior triggers in the channel without calling the incident-management platform's API.
---

Run this first on every invocation, before any investigation work.

## 1. Decide whether to engage

Read the triggering message text. If it is clearly NOT incident-related — casual chatter, off-topic conversation, a question about you, an unrelated link, an `@here` ping that doesn't reference an outage, a reaction-only event — do NOT post the ack and do NOT investigate. Stay silent and stop.

Engage only if the message is plausibly about a production incident, an alert, an outage, an error spike, a user-impact report, or a follow-up to one. **Alerts from the `<incident-management-platform>` bot (named in the adopting bundle's *Incident-management platform* section) always qualify**; for all other inputs, apply judgment. When unsure, stay silent — alert channels see lots of non-incident traffic and a false ack is louder than a missed engagement (the human can re-ping you explicitly).

Do NOT post a "not an incident, standing down" message either; silence means silence.

## 2. Record the triggering message

The Slack event's `event.ts` is the thread you will reply into for the rest of the incident. Store it.

## 3. Join the channel

Target channel id = `event.channel` from the triggering event.

<include src="kb://skills/slack/ensure-channel-membership.md" />

On failure: stay silent and stop. The trigger has no in-session human to ask for an `/invite`.

## 4. Acknowledge in-thread

Post one short ack to the triggering thread so humans know you picked it up:

```
:mag: investigating
```

This is the only acknowledgement message and it must be exactly this single line — no impact summary, no severity tag, no footer. Later updates follow the post-structure skill.

## 5. Parse the input

Extract `{title, service, severity, impact, url}` from the triggering message:

- **`<incident-management-platform>` bot alert.** The bot's `text`, `attachments`, and `blocks` contain the title, service, urgency, and the firing query / custom details. Read those directly. The adopting bundle's *Incident-management platform* section gives the platform's incident-URL shape — if the message includes a matching URL, extract the incident id from it for citation. The runtime has no credentials for the platform's HTTP API; do NOT attempt to call it directly (e.g. via `curl`).
- **Top-level non-platform message.** Treat the text as a free-form report. If it carries an incident URL matching the platform's URL shape, capture it for citation but get the actual incident details from the message text itself (and, if the alert is also in this channel, from the platform bot's Slack post via `conversations.history`). Otherwise extract who/what/when/impact from the text.
- **`<incident-management-platform>` resolution message in-thread.** Re-enter the same thread (`thread_ts = event.thread_ts`) and skip ahead to the post-resolution-summary skill.

Severity defaulting:

- The adopting bundle's *Incident-management platform* section maps the platform's urgency / priority field to the local P0-P3 scale (e.g. PagerDuty `urgency=high` → P1, `low` → P3). Use that mapping when the triggering message carries a platform-native urgency.
- Raise to P0 only on clear customer-wide outage signals (auth broken, product unusable for all tenants, data loss).
- For non-platform inputs, infer severity from the message text; default to P2 when impact is unclear and refine after investigation.

If input is ambiguous, ask one clarifying question in-thread and stop. Do not invent context.

## 6. Deduplicate against your own prior triggers only

Call `conversations.history` on the triggering channel for the last 24h and look for an open *top-level `<incident-management-platform>` alert* (i.e. another platform bot message at the channel root, not a reply) with the same service and matching title / firing query that *you* have already responded to.

"Already responded to" means *your own bot user* posted into that alert's thread. It does NOT mean someone else has — another agent running an in-thread analysis on the current alert is NOT a duplicate of you, and another *human* triaging the alert is also NOT a duplicate of you. The adopting bundle's *Sibling agents* section names any other AI agents whose posts must be filtered out for this purpose.

Only stop and post a one-line `duplicate of <link>` note when there is a clearly separate earlier top-level `<incident-management-platform>` alert in this channel that you yourself already worked. Do not call the platform's HTTP API.

After dedup, if you are continuing, hand off to the investigate skill.
