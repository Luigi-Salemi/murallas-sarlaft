---
name: feedback-triager-fixer-mode
description: Fixer mode for the Feedback Triager (Slack), entered from event-loop clause `f` when a human in the thread explicitly asks the bot to open a PR/MR — re-checks context, files a ticket if needed, dedupes against any prior worker, then composes `fix-via-pr-author` to launch `<PR_AUTHOR_EXPERT_ID>`; worker reports are relayed by event-loop clause `i`. Explicit-ask only; inert (posts a brief "not configured" reply) when `<PR_AUTHOR_EXPERT_ID>` is the literal placeholder.
---
## Fixer mode

Triggered when a non-bot reply (event-loop clause `a`) or `app_mention` (event-loop clause `e`) explicitly asks the bot to open / create / start a PR or MR, implement the feedback, or ship the change. Be conservative: pure agreement ("yes please") counts only when a prior bot or human message in the thread explicitly proposed launching the PR/MR Author. Even when a research pass concluded with high confidence and a small bounded fix is obvious, Fixer mode does NOT auto-launch — a human in the thread must explicitly ask.

The adopting bundle configures `<PR_AUTHOR_EXPERT_ID>` to a GitHub PR Author or a GitLab MR Author expert; the launch contract is identical for both. References to "PR/MR Author" below resolve to whichever the bundle configured.

### Pre-checks

- If `<PR_AUTHOR_EXPERT_ID>` is empty, missing, or left as the literal placeholder, Fixer mode is **inert**: post one brief reply in the thread that Fixer mode is not configured for this triager (mrkdwn-formatted, attributed per AGENTS.md) and stop.
- If `pr_author_session_url` is already set in scratch space (you previously launched the PR/MR Author for this thread), reply with the existing link and stop — never launch twice for the same root.
- Run the lifecycle skill's "Step 3.5: Re-check thread context before acting"; abort if the launch ask is now stale (teammate retracted, problem resolved, etc.).
- If no downstream ticket has been filed yet for this thread, file it now per the consumer's Act section (the PR/MR Author needs a `ticket_url`).

### Procedure

Compose the shared launch + follow-along handoff below. It owns the `worker-launch` call against `<PR_AUTHOR_EXPERT_ID>` and the one-line in-thread follow-along link posted immediately after launch. The Feedback-triager-specific inputs to the worker message — listed below — must be assembled by this skill before invoking the shared handoff.

**Worker message contents** (passed into the `worker-launch` call):

```
SOURCE: slack-feedback-thread
slack_channel_id: <CHANNEL_ID>
slack_thread_ts: <root_ts>
slack_permalink: <constructed permalink>
ticket_url: <filed ticket URL>
target_repo: <TARGET_REPO>
requesting_user: <Slack user id of the asker>
requested_by_name: <Slack display name of the asker>
requested_by_link: <slack_permalink>
task_summary: <2–4 sentence summary of root + thread>
context:
- Slack thread summary with key decisions
- Filed ticket identifier/title
- Any explicit non-goals or implementation direction from humans
milestone_updates: required
lifecycle: |
  Send one `worker-report-to-manager` call at each pause point in your PR/MR lifecycle (typically PR/MR opened, blocked on an external gate, ready to merge, and terminal). Each `summary` is a human-readable mrkdwn one-liner that includes the PR/MR `html_url`; use `terminate: true` only on your terminal report. Only two kinds of report reach the Slack thread: (a) the three user-facing milestones — PR Opened, PR Ready to Merge, PR Merged — and (b) any terminal report, regardless of outcome (so the thread always gets a final signal, including aborts and closed-without-merge). Every other intermediate report (blocked-on-review, CI-failure recovery, stale-review nudges) is processed internally. Pack user-facing context into the relayed summaries, and make your terminal `summary` user-facing on every path (state the outcome plainly when the PR is not merged). You have no Slack capability and must not post directly. After creating the PR/MR, send your first report, then continue into Phase 2 (monitoring initialization) per your system prompt; do NOT self-terminate after Phase 1.
```

After the shared skill returns, save the launched worker's id as `pr_author_worker_id` and its session URL as `pr_author_session_url` in scratch space. The clause `c` root-withdrawal path uses these to call `worker-terminate` on the worker; the clause `i` worker-report relay uses `pr_author_worker_id` to confirm an inbound `<worker>` report belongs to this thread, and clears both keys when the worker reports `terminate: true`.

<include src="kb://skills/slack/fix-via-pr-author.md" />

Do NOT add reactions on the root message after launch (the `:white_check_mark:` settled reaction was already added when the ticket was filed). Stay alive in the event loop. PR/MR Author reports arrive as `<worker name="..." status="...">` messages — event-loop clause `i` handles the relay per its own contract.

### No auto-fire

Fixer mode is explicit-ask only. Even when a research pass concluded with high confidence and a bounded fix is obvious, this skill does NOT auto-launch. A human in the thread must explicitly ask. This keeps a human in the loop on every code change.
