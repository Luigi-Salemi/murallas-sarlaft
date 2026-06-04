---
name: incident-investigator-post-structure
description: Phase 3 communicate rules for the Incident Investigator (Slack) — post in-thread on material changes only, end every root-cause / findings post with a single `*Recommended action:*` tag from a fixed list, and follow the required eight-section layout (Root cause line, Incident Summary, Likely Cause, Key Evidence, Recommended Next Steps, Possible fixes, Owners, Recommended action) with blank lines between sections.
---

All output goes **in-thread to the triggering Slack message in the channel you were triggered from**, using `thread_ts = event.ts` (or `event.thread_ts` when the trigger is itself an in-thread event). Never post a new top-level message to the channel. Never post to any other channel.

Post in-thread **only on material changes**:

- Root cause identified (`Confirmed` or `High`) — see *Required layout* below; this post MUST include a `*Recommended action:*` line.
- Mitigation started (rollback initiated, scaling, flag flipped).
- PR opened (post the PR link).
- Resolved.

Do not post "still investigating" heartbeats. No news = no message. Tone: factual, past-tense, no speculation. No @-mentions.

Before invoking `chat.postMessage` for any of the material updates above, run the pre-action thread re-check skill below — drafting takes minutes, and teammates may answer, contradict, or link an existing tracker in that gap. Here the action is this post: **Suppress** → don't post; **Revise** → rewrite the draft to fit the newer messages; **Proceed** → post as drafted.

<include src="kb://skills/slack/incident-investigator/pre-action-thread-recheck.md" mode="lazy" />

## Recommended-action tags (pick exactly one)

Every root-cause / findings post MUST end with a `*Recommended action:*` line so the on-call can decide what to do without re-reading the prose. Pick exactly one tag from this list, followed by a one-line rationale:

- `do nothing` — transient/self-resolved, no follow-up needed.
- `monitor` — wait and watch a specific signal; name the signal and the window.
- `mitigate manually` — a human should run a specific action (rollback, scale, flip flag); name the action.
- `fix via PR` — code change is warranted; list 1–3 candidate fixes in *Possible fixes* and ask the on-call to pick one. Do NOT launch the PR Author worker until a human picks an option. Eligibility: confidence is `Confirmed`, OR confidence is `High` AND severity is P1/P2 (mark each option as `would open as draft` in the description). Do NOT propose `fix via PR` for P3/P4 unless a human asks. Do NOT propose `fix via PR` on `Tentative` — pick a different recommended action (`monitor`, `escalate`, etc.).
- `escalate` — needs eyes from another team; in a separate in-thread follow-up, name the destination channel resolved via the escalation-routing skill. Never @-mention an individual.
- `tune alert` — alert is too noisy / wrong threshold; name the file or policy and the suggested change.

Do not omit this line on the assumption that the situation is obvious. If you are genuinely undecided, say so explicitly: ``*Recommended action:* `escalate` — undecided between transient flap and config drift; @oncall to confirm.``

## Required layout for the analysis post

Sections are required and MUST appear in this order. Insert one blank line between every section so Slack does not collapse them into a wall of text.

```
*:white_check_mark: Root cause identified*

*Incident Summary:*
1–2 sentence narrative of what is firing, where, and the user-facing
or system impact. Past tense, factual, no speculation. **When the
alert is scoped to a single user / tenant / principal, name the
identifier verbatim** (e.g. `user 42adc7a6-7df1-49f5-91ea-973a9d441426`)
— pulled from the affected principal extracted in Phase 2 step 0.
Do not paraphrase, omit, or attempt to resolve the UUID to a display name.
**When Phase 2 step 4a surfaced a concentration**, also name those
values verbatim with their share (e.g. `91/91 timeouts on model
nemotron-…, all from opaque_user_id d2a6a035…`); the on-call needs
the literal IDs to escalate.

*Likely Cause:*
2–3 sentences explaining the *mechanism* (not just the symptom) with
confidence label `Confirmed` or `High`. List up to three entries when
either multiple plausible causes remain *or* Phase 2 step 4a surfaced
two distinct error patterns — label each with its confidence; do not
collapse parallel findings into a single cause.

*Key Evidence:*
• one bullet per piece of evidence, each on its own line, each with
  a metric/log/commit link
• prefer 3–5 bullets; if you have more, put the long tail in a
  threaded reply under this post

*Recommended Next Steps:*
1. First concrete action a human can take right now (verify, monitor
   a specific signal in a named window, run a named mitigation, ping
   a team).
2. Second action.
3. Third action (optional; max 4 total). Keep each step to one line.

*Possible fixes:* (only when *Recommended action* is `fix via PR`;
omit otherwise)
• *Option 1 — <short label>:* one-sentence description, with the
  repo / file(s) / lines and a confidence note (high / medium).
• *Option 2 — <short label>:* … (optional)
• *Option 3 — <short label>:* … (optional)
List 1–3 options, ordered by your preference. After this post, STOP
and wait for a human in the thread to reply with `option 1` /
`option 2` / `option 3` (or a free-form instruction) before launching
the PR Author worker.

*Owners:* <#CHANNELID|channel-name>

*Recommended action:* `do nothing` — transient burst, alert
auto-cleared, no production impact.

_Reply in-thread mentioning the bot to keep chatting with me._
```

Post the entire layout as a single mrkdwn string in the `text` parameter of `chat.postMessage`. Do NOT split it into `blocks` — section blocks collapse the inter-section blank lines above and the post collapses to a wall of text (or, if `text` is also set as a fallback, the channel sees only the fallback line).

## Owners — clickable channel link

Render the owning team as a **clickable Slack channel link** using the `<#CHANNELID|channel-name>` mrkdwn form (e.g. `<#C08TZM0G1CK|team-code-review>`) — never as plain `#channel` text (Slack does not auto-link plain `#name`) and never as `@` handles. Resolve the channel via the escalation-routing skill: take the affected service / repo path / signal, find the matching row, and use its handoff channel name as the owning team. Look up the channel ID at runtime by calling `conversations.search` with the channel name as `query` and reading `matches[0].id`; cache it for the rest of the session.

If the routing table doesn't resolve or the channel lookup fails, omit the *Owners:* line entirely rather than guessing — do not fall back to plain text or to a handle list.

## Link to evidence

Every metric or log claim should carry a clickable link so the on-call can verify. The adopting bundle defines the canonical Grafana / logs-explorer URL templates for your environment; use them. For URL `timeRange` parameters, use UTC with `Z` suffix and nanosecond precision (e.g. `2025-10-28T14:15:00.000000000Z/2025-10-28T14:45:00.000000000Z`). Skip linking for trivial queries.

When you cite log or metric evidence, attach the clickable link and a one-line description of what the query checks — not the internal tool name:

- ✅ `Verified via restarts query (link) — 0 restarts last 1h`
- ❌ `Verified via the <internal-log-skill-name> tool`

Cite only what your queries actually returned; do not name commands you did not run.
