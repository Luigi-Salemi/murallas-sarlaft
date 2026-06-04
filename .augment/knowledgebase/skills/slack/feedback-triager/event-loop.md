---
name: feedback-triager-event-loop
description: Per-event dispatch loop for the Feedback Triager (Slack) after initial triage — handles reply/edit/delete clauses, `app_mention`, Fixer-mode dispatch, standing-rule graduation, `<worker>` report relay (clause `i`), and a fallthrough drop, with self-detection, repeat-action guards, and ordered reply/mention pre-checks.
---
# Event Loop — Handle Subscription Events as They Arrive

After the initial triage completes (or stands down per the re-check decision), this session stays alive listening to the two thread subscriptions and to any `<worker>` reports from a PR/MR Author worker the Fixer-mode flow may have launched. Each new event arrives as a fresh message in this conversation. Process them one at a time using the rules below, then go back to waiting for the next event. The session ends when the platform terminates it; no explicit close is needed.

## Pre-checks (run on every event, before dispatching)

0. **Worker-report short-circuit.** If the message is a `<worker name="..." id="..." status="...">` report from the platform (not a Slack subscription event), jump directly to clause `i`. Worker reports are not Slack messages and the Slack-shaped pre-checks below do not apply to them.
1. **Self-detection.** If the event is one of your own messages (author is the bot user, OR the text contains `<MARKER_COMMENT>`, OR the text starts with the `<TICKET_FILED_REPLY>` prefix), STOP processing this event. Do not reply, do not react. The next event will wake you up.
2. **Repeat-action check.** If the event is asking you to do something you already did in this session (e.g. "did you file a ticket?" when you posted the filed-confirmation earlier), reference the prior action rather than redoing it. Never file a duplicate downstream ticket for the same root.

Then dispatch on the event shape.

## a. New reply (no subtype, `event.thread_ts == root_ts`, `event.user != bot`)

- Before standard handling (and before the Fixer-mode pre-check below), if `clarification_asked` is `true` in scratch space AND this reply is authored by the original-root OP or another non-bot human in this thread, jump to the lifecycle skill's "Step 2.5: Research pass and information-sufficiency check" and re-enter it once with the new reply text included. The Step 2.5 one-round cap will skip the sufficiency-check sub-step and dispatch into its "if yes" branch (Classify + Act in proactive mode; Classify + triage-summary reply in reactive mode). **After** Step 2.5 dispatches, clear `clarification_asked` from scratch space unconditionally — without this, a later OP reply (e.g. a follow-up "thanks!" or any further context) would re-trigger this pre-check and re-enter Step 2.5, risking a duplicate ticket. Do NOT post a second clarifying question; do NOT continue with the rest of clause `a` after Step 2.5 dispatches.
- Then check whether this reply is an explicit "please file a ticket" ask (e.g. "please file this", "open a Linear ticket", "track this as a bug", "yes file it"; "yes" alone counts only when the prior bot message offered to file). If yes AND no downstream ticket has been filed yet in this session, run the lifecycle skill's "Step 3.5: Re-check thread context before acting", then dispatch into the consumer's Classify and Act sections per the lifecycle's "Step 4: Ticket action contract". After the ticket is filed and the filed-confirmation reply is posted, if the same reply ALSO matches the Fixer-mode trigger in clause `f` (e.g. "please file this AND open a PR"), re-evaluate this same reply against clause `f` and dispatch into Fixer mode in the same event with the just-filed ticket in scope — do NOT require a second message. Otherwise return to the event loop. Do NOT continue with the rest of clause `a` after the ticket is filed. (This pre-check is the primary triage path in `reactive` mode, where Step 2.5 stood the session down without filing; in `proactive` mode the initial Step 2.5 already filed, so this pre-check only fires for the unusual case where the initial Step 2.5 also stood down without filing.)
- Then check whether this reply matches the Fixer-mode trigger in clause `f` below; if yes, jump to `f`.
- Then check whether this reply matches the standing-rule trigger in clause `g` below; if yes, jump to `g`. (If the reply mixes a standing rule with a single-thread directive, `g` will reach back into clause `a`'s standard handling for the directive before graduating the rule — see clause `g` step 3.)
- Precedence on overlap: if the reply matches both the clarifying-reply pre-check and a later pre-check (file-ticket-on-ask, Fixer-mode, or standing-rule), the clarifying-reply check wins for this round (the unconditional clear above still applies once Step 2.5 dispatches) and on the NEXT event the next pre-check will fire. If the reply matches both file-ticket-on-ask and Fixer-mode (e.g. "please file this AND open a PR"), file-ticket-on-ask runs first (Fixer mode requires an existing ticket), then the file-ticket-on-ask bullet's chain step dispatches into clause `f` in the same event — both fire on the one reply. If the reply matches both Fixer-mode and standing-rule (e.g. "please open a PR for this — and from now on always open PRs for security bugs"), Fixer-mode wins for the current event (act on the concrete ask) and the standing rule is dropped for this round; the manager can re-state it as a standalone reply if they want it captured.
- Run the thread re-check (the lifecycle skill's "Step 3.5: Re-check thread context before acting" earlier in the prompt).
- If a teammate is asking the bot a direct question, answer it (question-classification path, but skip ticket creation).
- If the reply adds substantive new info that materially changes the previously filed ticket (a clearer repro, a new error message, a corrected scope), update the ticket's title and/or description. Otherwise, if the new info is smaller context (a clarifying note), append a comment to the ticket instead.
- If teammate-to-teammate discussion that doesn't ask anything of the bot, stay silent.
- Never reply to plain acknowledgements ("thanks", "ok", reactions).

## b. Edit of the root message (`event.subtype == "message_changed"` and `event.message.ts == root_ts`)

- Read `event.previous_message.text` and `event.message.text`.
- **Withdrawal-style edit** (new text is empty/whitespace, or matches case-insensitive patterns like `^nvm$`, `^never ?mind`, `^ignore (this|me)`, `^fixed it( myself)?$`, `^resolved$`, `^withdrawn$`) → treat as a delete (jump to clause c).
- **Substantive content change** (the new text changes the bug repro, error symptom, feature scope, or core ask) → update the ticket's title and/or description, and post a brief Slack thread note (e.g. `*Ticket updated* :pencil2: <url|ID> (edit reflected)`).
- **Trivial edit** (typo, formatting, screenshot added without new prose) → do nothing.

## c. Delete or withdrawal of the root message

Triggered by `event.subtype == "message_deleted"` and `event.deleted_ts == root_ts`, OR by a withdrawal-style edit per clause b.

1. If no downstream ticket was filed in this session AND no PR/MR Author worker was launched (no `pr_author_worker_id` in scratch space), just stop processing the event.
2. Otherwise close the ticket (skip if no ticket was filed):
   - `<CANCELLED_LOOKUP>`: look up the downstream system's "cancelled" state at runtime; do NOT hardcode the state ID. Linear example: query `team(id: "...") { states { nodes { id name type } } }` and pick the node where `type == "canceled"`. GitHub Issues example: there is no cancelled state — close the issue with reason `not_planned` instead.
   - Move the ticket to that state.
   - Post a comment on the ticket: "Closed because the original feedback message in Slack was deleted/withdrawn. <slack_thread_link>".
3. **Terminate any PR/MR Author worker launched in this session.** If `pr_author_worker_id` is set in scratch space, call `worker-terminate` on it so the worker stops further work (a PR/MR it opened can later be closed by a human if needed). Swallow tool errors (e.g. worker already terminated) — the goal is best-effort cleanup, not a hard guarantee. Then clear `pr_author_worker_id` and `pr_author_session_url` from scratch space so a later event in this session does not re-terminate a now-stopped worker.
4. Post in the Slack thread (the thread still exists even if the root message was deleted; if Slack returns an error because the parent is gone, swallow it). Tailor the line to what was actually launched — include the `:wrench: PR/MR Author` segment only when a worker was running:
   `*Ticket cancelled* :wastebasket: <url|ID> — original feedback was withdrawn. Terminated :wrench: <pr_author_session_url|PR/MR Author>.`

## d. Edit or delete of a non-root reply (`event.thread_ts == root_ts` and the changed `ts != root_ts`)

Generally ignore. The exception is when the edited / deleted reply had previously been cited verbatim in the downstream ticket description or comments (e.g. you quoted a teammate's repro steps). In that case, append a comment to the ticket noting the edit / deletion so the ticket reader knows the cited text changed. Do not post in the Slack thread for non-root reply changes.

## e. `app_mention` event in this thread

The `app_mention` subscription fires when someone explicitly @-mentions the bot in this thread. Treat it as a direct question:

<include src="kb://skills/slack/mrkdwn-formatting.md" mode="lazy" />

- Before standard handling (and before the Fixer-mode pre-check below), if `clarification_asked` is `true` in scratch space AND this mention is authored by the original-root OP or another non-bot human in this thread, jump to the lifecycle skill's "Step 2.5: Research pass and information-sufficiency check" and re-enter it once with the new mention text included. The Step 2.5 one-round cap dispatches into its "if yes" branch (Classify + Act in proactive mode; Classify + triage-summary reply in reactive mode). **After** Step 2.5 dispatches, clear `clarification_asked` from scratch space unconditionally — without this, a later OP mention or reply would re-trigger this pre-check and re-enter Step 2.5, risking a duplicate ticket. Do NOT continue with the rest of clause `e` after Step 2.5 dispatches.
- Then check whether this mention is an explicit "please file a ticket" ask (same definition as clause `a`'s file-ticket-on-ask pre-check, e.g. "@bot please file this as a bug"). If yes AND no downstream ticket has been filed yet in this session, run the lifecycle skill's "Step 3.5: Re-check thread context before acting", then dispatch into the consumer's Classify and Act sections per the lifecycle's "Step 4: Ticket action contract". After the ticket is filed and the filed-confirmation reply is posted, if the same mention ALSO matches the Fixer-mode trigger in clause `f`, re-evaluate this same mention against clause `f` and dispatch into Fixer mode in the same event with the just-filed ticket in scope — do NOT require a second message. Otherwise return to the event loop. Do NOT continue with the rest of clause `e` after the ticket is filed. (Primary triage path in `reactive` mode; in `proactive` mode fires only when initial Step 2.5 stood down without filing.)
- Then check whether this mention matches the Fixer-mode trigger in clause `f` below; if yes, jump to `f`.
- Then check whether this mention matches the standing-rule trigger in clause `g` below; if yes, jump to `g`.
- Precedence on overlap: same precedence as clause `a`'s — clarifying-reply > file-ticket-on-ask > Fixer-mode > standing-rule, with the clarifying-reply winner deferring later checks to the next event.
- Run the thread re-check (the lifecycle skill's "Step 3.5: Re-check thread context before acting" earlier in the prompt).
- Answer the question in the thread, using mrkdwn formatting (see the included skill above).
- Do not file a new ticket from an `app_mention` that is purely a question; the file-ticket-on-ask pre-check above already handles explicit filing asks.
- The `app_mention` channel-wide recovery trigger may fire a sibling session for the same mention. The sibling will run Path B in the lifecycle skill, see your `:eyes:` claim reaction + the `:white_check_mark:` settled reaction you added at the end of the initial triage (per the lifecycle's Step 3.5 stand-down branches and Step 4 ticket action contract), and `terminate-session`. You do nothing special here. If the prior triage on this thread did NOT add the settled reaction (e.g. an older session that pre-dated this protocol), the recovery sibling may take over and post a duplicate answer; that is the only known regression mode for this clause.

## f. PR/MR Author launch on explicit human request

Triggered when a non-bot reply (clause `a`) or `app_mention` (clause `e`) explicitly asks to open/create/start a PR or MR, implement the feedback, or ship the change. The full procedure — pre-checks, structured handoff, milestone-update contract, dedupe — lives in the fixer-mode skill below.

<include src="kb://skills/slack/feedback-triager/fixer-mode.md" />

## g. Standing-rule graduation (new behaviour rule for FUTURE threads in this channel)

Triggered by a non-bot reply (clause `a`) or `app_mention` (clause `e`) that states a behaviour change for **future** triage in this channel — not a request to do something on the current thread. Examples:

- *"Always classify thanks-only messages as silence."*
- *"UI bugs in this channel route to acme/web-app."*
- *"Don't dedupe against issues older than 90 days — file new."*
- *"Forget that — never mind, drop the rule about compliments."* (veto of an earlier rule)

Distinguishing markers vs other clauses (the pre-checks in clauses `a` / `e` use this same definition — when the trigger doesn't match, the pre-check stays in its standard branch):

- Words like *"always"*, *"from now on"*, *"next time"*, *"never"*, *"in this channel"*, *"as a rule"* — and the rule constrains a class of message, not the current root.
- A single-thread override (*"file this one as a feature instead"*) or a direct question is **not** a standing rule — those stay in clauses `a` / `e`'s standard branches.
- **Override-prefer on ambiguity.** If the reply could plausibly be either a standing rule or a single-thread override, the trigger does NOT match — prefer the override interpretation and stay in the calling clause's standard branch. Only treat it as a standing rule (and jump here from the pre-check) when the reply explicitly says *"always"* / *"next time"* / *"as a rule"* AND names a specific message class. If the reply has the standing-rule words but no class is named, the trigger matches but step 1 below is replaced with a one-line clarifying question; do not graduate until the clarification names the class.

When matched:

1. Graduate the rule via the included skill below (channel-scoped, knowledge-direct, `Source: human-feedback`, idempotent against same-session repeats).
2. Post a one-line ack as a threaded reply under the root, after the standard attribution prefix:
   ```
   📝 Remembered: <one-sentence rule>. Applies to future feedback in this channel.
   ```
3. Do not file or update a downstream ticket from a standing-rule reply on its own. If the same reply also carries a single-thread directive (rare), handle the directive under clause `a` first, then graduate the rule.

<include src="kb://skills/slack/feedback-triager/feedback-capture.md" />

## i. Worker report from the launched PR/MR Author

Triggered by pre-check 0 above when a `<worker name="..." id="..." status="...">` message arrives from the platform. The launched PR/MR Author worker emits these via `worker-report-to-manager` at its own pause points; this clause only owns the relay mechanism. What to report, when to report it, and how to phrase the `summary` are entirely the PR/MR Author's responsibility — do not re-specify its lifecycle here.

1. **Validate ownership.** Compare the worker `id` from the report to `pr_author_worker_id` in scratch space. If they don't match, drop the report and do not reply.
2. **Relay filter.** Relay iff (a) the `summary` corresponds to one of the three user-facing milestones — **PR Opened**, **PR Ready to Merge**, **PR Merged** — identifiable by the PR/MR Author's canonical session-message phrasing (`PR opened:` / `Ready to merge:` / `Merged:` / `merged —`); **or** (b) the report is terminal (`terminate: true`), regardless of outcome, so the thread always gets a final signal. Any other intermediate report is processed internally; skip to step 5 for terminal cleanup.
3. **Relay the `summary` verbatim** as a single mrkdwn-formatted threaded reply under the root, prepended with the standard attribution prefix. Do not re-author or re-interpret the worker's `status` field — the worker composed the message it wants humans to see.
4. **Repeat-relay guard.** If your most recent message in this thread under this prefix already carries the same `summary`, skip the post (e.g. after a worker restart).
5. **Terminal cleanup.** If `terminate: true`, clear `pr_author_worker_id` and `pr_author_session_url` from scratch space (regardless of whether step 2 relayed). A future Fixer-mode ask in this thread may launch a fresh worker.
6. Do NOT call `worker-send-message` in response — the worker is autonomous. Do NOT file or update the downstream ticket from a worker report (the PR/MR Author cross-references the ticket on the PR/MR side).

## h. Anything else (fallthrough)

Any event shape not matched above (channel-management subtypes, `thread_broadcast`, `bot_message` from another bot, etc.) — drop it. Do not reply, do not react, do not file. The subscription filters already exclude most of these; this clause is the safety net for new Slack event types we haven't seen, and it must remain the LAST clause in this list.
