---
name: incident-investigator-capture-learning
description: Incident-response binding for the simple-memory capture skill. Sets TEAM=incident-response and SCOPE=channel_<CHANNEL_ID>, defines the per-channel `##` headings (triage / routing / investigation / silence / dedup / cross-cutting) and the `- <rule>. (<slack-permalink>, YYYY-MM-DD)` bullet shape. Called by the host prompt's standing-rule pre-check on in-thread replies.
---

# Capture incident-response learning

Thin binding for the included simple-memory capture skill (see knowledgebase `guides/cloud/expert-memory.md` § Simple memory model).

Bindings:

- `{TEAM}` = `incident-response`.
- `{SCOPE}` = `channel_<CHANNEL_ID>` (literal `channel_` + Slack channel ID of the alert / incident channel that triggered or is being watched, e.g. `channel_C0123456789`).

Allowed `##` headings (pick the one the rule constrains; create on first use):

- `triage` — what counts as an incident vs noise in this channel (tightens or loosens the Phase 1 engage decision).
- `routing` — service / signal → owning team or handoff-channel overrides on top of the adopting bundle's *Service / signal → handoff channel* table. Use this when the table is silent on a service or when ownership has changed since the bundle was applied.
- `investigation` — known runbook steps, recurring root causes, or things to check first for a given alert / service.
- `silence` — alert or message shapes the agent should never engage with (recurring flaky alert, known test alert, scheduled-job notice, …).
- `dedup` — rules for handling recurring alerts (e.g. "if the same alert fires twice within 10 minutes, treat as duplicate of the first").
- `(cross-cutting)` — rules that don't fit a single class above.

**Stable contract.** These heading names are referenced by `kb://skills/slack/incident-investigator/memory.md` § Load memory ("a `silence` / `triage` rule may flip the Phase 1 engage decision", "a `routing` rule may override the adopting bundle's *Service / signal → handoff channel* table", "an `investigation` rule may shortcut Phase 2"). Renaming or removing any of them silently breaks that prose — keep the two files in lockstep.

Bullet shape:

```
- <one-sentence rule>. (<slack-permalink>, YYYY-MM-DD)
```

The slack-permalink is the thread permalink for the reply that carried the rule (see `kb://skills/slack/thread-permalink.md` for construction). The date is today's UTC date in `YYYY-MM-DD` form.

Veto specialization: a same-thread veto from the original author or a teammate active in the same thread (*"forget that"*, *"undo the routing rule about billing"*) whole-line deletes the matching bullet. Reply `Got it — removed.`

The standing-rule pre-check in `kb://skills/slack/incident-investigator/memory.md` § Capture standing rules is the only writer for this binding.

<include src="kb://skills/memory/simple/capture.md" />
