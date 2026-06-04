---
name: incident-investigator-memory
description: Shared memory wiring for any Slack alert / incident expert — binds TEAM=incident-response and SCOPE=channel_<CHANNEL_ID>, loads per-channel learnings at session start via the simple-memory loader, and defines the standing-rule capture trigger that fires on in-thread replies stating a behaviour change for FUTURE incidents in this channel.
---

# Context for shared skills (memory)

When the included memory skills below refer to your memory team or scope key:

- `{TEAM}` = `incident-response`. Memory is owned by this expert family; never mix paths with other teams' knowledge trees.
- `{SCOPE}` = `channel_<CHANNEL_ID>` (literal `channel_` + the Slack channel id of the alert / incident channel that triggered or is being watched, e.g. `channel_C0123456789`). One scope per Slack channel — incident-response learnings are anchored to a single channel.

# Load memory (run once per session, before Phase 1 triage)

<include src="kb://skills/memory/simple/load.md" />

Use matching learnings to inform later phases:

- A `silence` or `triage` rule may flip the Phase 1 engage decision (engage on a shape the bundle would otherwise drop, or stay silent on a shape that looks incident-like but the team has classified as noise).
- A `routing` rule may override or supplement the adopting bundle's *Service / signal → handoff channel* table during Phase 3 *Owners:* resolution and escalation routing. Memory wins over the table on conflict — the table is the apply-time default, memory is the team's running correction.
- An `investigation` rule may shortcut Phase 2 by pointing at a known root cause to check first.
- A `dedup` rule may convert a fresh trigger into a `duplicate of <link>` note in Phase 1 step 6.

If `knowledge/{SCOPE}.md` does not exist yet, proceed with no learnings.

# Capture standing rules (run on every in-thread reply from a human)

When a non-bot reply on an engaged incident thread states a behaviour change for FUTURE incidents in this channel — not a request to do something on the current incident — capture it via the included binding skill below. Run this pre-check BEFORE the standard in-thread reply handling (the decide-respond rule in `kb://skills/slack/subscribe-and-respond.md`) so a captured standing rule does not also produce an unrelated in-thread reply.

Trigger markers (all must hold):

- Words like *"always"*, *"from now on"*, *"next time"*, *"never"*, *"in this channel"*, *"as a rule"*.
- The rule constrains a class of alert / signal / message / service, not the current incident.

**Override-prefer on ambiguity.** If a reply could plausibly be either a standing rule or a single-incident override (*"escalate this to billing"* vs *"always escalate billing alerts to #team-billing"*), the trigger does NOT match — prefer the single-incident interpretation and fall through to standard in-thread handling. Only treat it as a standing rule when the reply explicitly carries one of the marker words above AND names a specific class.

When matched:

1. Graduate the rule via the included binding skill below (channel-scoped, knowledge-direct, `Source: human-feedback`, idempotent against same-session repeats).
2. Post a one-line ack as a threaded reply under the incident root — plain text, no attribution prefix:

   ```
   📝 Remembered: <one-sentence rule>. Applies to future incidents in this channel.
   ```

3. Do NOT alter the current incident from a standing-rule reply on its own (no extra investigation post, no new escalation, no PR Author launch). If the same reply also carries a single-incident directive (rare), handle the directive under standard in-thread handling first, then graduate the rule.

Vetoes of an earlier rule (*"forget that — drop the rule about test alerts"*) are handled by the binding skill's same-session whole-line delete; reply `Got it — removed.`

<include src="kb://skills/slack/incident-investigator/capture-learning.md" />
