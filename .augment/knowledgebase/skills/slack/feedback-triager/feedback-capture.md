---
name: feedback-triager-feedback-capture
description: Feedback-triager binding for the simple-memory capture skill. Sets TEAM=feedback-triager and SCOPE=channel_<CHANNEL_ID>, defines the action-class `##` headings and the `- <rule>. (<slack-permalink>, YYYY-MM-DD)` bullet shape. Called by the event loop on standing-rule replies.
---

# Capture triage feedback

Thin binding for the included simple-memory capture skill (see knowledgebase `guides/cloud/expert-memory.md` § Simple memory model).

Bindings:

- `{TEAM}` = `feedback-triager`.
- `{SCOPE}` = `channel_<CHANNEL_ID>` (literal `channel_` + Slack channel ID, e.g. `channel_C0123456789`).

Allowed `##` headings (action classes — pick the one the rule constrains; create on first use):

- `classification` — what counts as a bug / feature / noise / question.
- `routing` — which downstream repo / project / owner a class of feedback files against.
- `dedup` — rules for merging vs filing new.
- `silence` — message shapes the bot should never act on.
- `(cross-cutting)` — rules that don't fit a single action class.

**Stable contract.** These heading names are referenced by the prompt template's Step 0 prose (knowledgebase `expert-templates/prompts/feedback-triager.md` § Step 0 — Load memory: "a `classification` / `silence` / `dedup` rule may answer the thread", "a `routing` rule may decide the downstream repo or project"). Renaming or removing any of them silently breaks the prompt's reader prose — keep the two files in lockstep.

Bullet shape:

```
- <one-sentence rule>. (<slack-permalink>, YYYY-MM-DD)
```

The slack-permalink is the thread permalink for the reply that carried the rule (see `kb://skills/slack/thread-permalink.md` for construction). The date is today's UTC date in `YYYY-MM-DD` form.

Veto specialization: a same-thread veto from the original author or a teammate active in the same thread (*"forget that"*, *"undo the rule about compliments"*) whole-line deletes the matching bullet. Reply `Got it — removed.`

The standing-rule branch in `event-loop.md` is the only writer for this binding.

<include src="kb://skills/memory/simple/capture.md" />
