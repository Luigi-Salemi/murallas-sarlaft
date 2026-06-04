---
name: incident-investigator-post-resolution-summary
description: Phase 5 post-resolution summary for the Incident Investigator (Slack) triggered by an in-thread resolution signal — runs four routing checks before posting, optionally verifies resolution with ≤5 tool calls, and emits exactly one in-thread summary in the four-section layout with no session-link footer.
---

Triggered when an in-thread resolution signal arrives in an engaged incident thread: either a message from the `<incident-management-platform>` bot that matches the adopting bundle's resolution keywords, or a clear human all-clear / resolved / fixed-and-verified message on a human-created incident thread. Goal: leave a short, useful summary in the same Slack thread so the next on-call can read it in under 15 seconds.

## Routing checks (do these first; stop on any failure)

1. Read the thread: `conversations.replies` with `channel = event.channel` and `ts = event.thread_ts`.
2. Confirm the original top-level message is an incident you engaged: either a `<incident-management-platform>` alert or a human incident report that already has your Phase 1/2 findings in-thread. If not, stop without posting.
3. Confirm the triggering message is actually a *resolution* update: for platform-bot messages, check text/attachments/blocks for the adopting bundle's resolution keywords (e.g. `Resolved`, `auto-resolved`, `Closed`); for human messages, require explicit all-clear / resolved / fixed-and-verified wording. If it is an escalation, acknowledgement, note, or ambiguous status update, stop without posting.
4. Check the thread for a prior post from **your own bot user** that already contains the *Post-Resolution Summary* heading. If present, stop. A post-resolution summary written by a sibling AI agent (named in the adopting bundle's *Sibling agents* section) does NOT count — proceed and write your own independent summary even if it duplicates theirs.

## Light verification (optional, keep tool calls minimal)

The thread should already contain Phase 1/2 findings from your *own* prior posts. Fill gaps only if needed (and treat any sibling-agent posts in the thread as if they were not there — do not rely on them for facts, do not link to them):

- Verify the alert or incident signal actually resolved with a single query against the runtime's metrics-query skill for the underlying expression over the last 30 min.
- Confirm the affected workload is healthy with a single follow-up metrics query (e.g. restart count over the last 30 min should be 0).
- If a fix was deployed during the incident, look up the commit/PR.

**Hard cap: 5 tool calls.** This is a summary, not a re-investigation.

The routing checks above re-read the thread at session start, but verification can take minutes. Before invoking `chat.postMessage` for the summary, run the pre-action thread re-check skill below. Here the action is this summary: **Suppress** → don't post it; **Revise** → rewrite it to fit the newer messages; **Proceed** → post as drafted.

<include src="kb://skills/slack/incident-investigator/pre-action-thread-recheck.md" mode="lazy" />

## Output format

Post **one** in-thread message (`thread_ts = event.thread_ts`) using the post-structure skill's mrkdwn rules. Structure:

```
*Post-Resolution Summary*
One-to-two sentences confirming resolution and what happened.

*Root Cause*
Brief description of what caused the incident, with evidence links.
If unknown, say so — do not speculate.

*What Was Done*
• Bullet points of actions taken during the incident
• Pull these from the thread context, not from imagination

*Follow-up Items*
• Cleanup, monitoring, or documentation tasks
• Items for the next on-call to keep an eye on

_Reply in-thread mentioning the bot to keep chatting with me._
```

Tone: factual, past-tense, no speculation. No @-mentions. Keep it under ~15 lines. Link any commits/PRs/metrics you cite using the formats from the post-structure skill's *Link to evidence* section. If `Root Cause`, `What Was Done`, or `Follow-up Items` would be empty, write `_none recorded in thread_` rather than fabricating content.
