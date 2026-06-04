---
name: feedback-triager-lifecycle
description: Per-thread triage lifecycle for the Feedback Triager (Slack) — the durable scaffolding (thread ownership, investigating ack, research + sufficiency check, re-check before acting, ticket action contract) that brackets the consumer-owned Classify and Act work, plus reply-style invariants (Fixer mode lives in the event-loop, not here).
---
# Decide Once Per Thread (Lifecycle)

This skill is the durable scaffolding for handling one Slack thread end-to-end. It covers the sections that bracket the consumer-owned classification and ticket-filing work:

- **Step 0 / 1** runs at session start to claim the thread or stand down.
- **Step 1.5** posts the in-thread acknowledgement once the bot owns the thread.
- **Step 2.5** runs the research pass and information-sufficiency check.
- **Step 3.5** runs in-line, immediately before posting any reply or filing a ticket.
- **Step 4** is the contract the consumer's ticket-filing implementation must satisfy.
- **Reply-style invariants** govern when and how this session posts in the thread.

The classification step (between Step 2.5's dispatch and Step 4) and the actual ticket call (Step 4 body) are consumer-owned and live in the calling expert. Fixer mode — explicit-ask-only PR/MR Author hand-off — is dispatched from the event-loop skill, not from this lifecycle.

## Step 0: Identify the trigger payload and `root_ts`

Determine which trigger fired this session and extract the root message timestamp:

- **Fresh root** (`new-feedback-root`): `event.ts` is the root_ts.
- **Recovery** (`app-mention-recovery`): the mention is somewhere in a thread. `event.thread_ts` is the root_ts if set; otherwise `event.ts` is itself the root (treat as fresh).

Save `root_ts`, `root_channel = event.channel`, and (for recovery) the `mention_ts` and `mention_user` for later. The `<TICKET_FILED_REPLY>` and `<MARKER_COMMENT>` values come from your context block.

## Step 1A: Claim the thread (Path A — fresh root)

Call `reactions.add(channel: <root_channel>, name: "eyes", timestamp: <root_ts>)`.

- `ok` → you own this thread; continue to the Subscribe phase.
- `already_reacted` → another session beat you to the claim. `terminate-session` immediately. Do nothing else.
- any other error → log and `terminate-session`.

## Step 1B: Claim the thread (Path B — app_mention recovery)

1. Read `conversations.replies(channel: <root_channel>, ts: <root_ts>)` and inspect the bot's reactions on the root message.
2. **Stand-down signal** — the bot user has the `:white_check_mark:` *settled* reaction on the root.

   The settled reaction is added by the prior session once it finalizes its initial triage decision, regardless of whether the decision was to file a ticket or to stand down per the Step 3.5 re-check (see "Step 3.5" and "Step 4: Ticket action contract" below). When you see it, an alive sibling already owns this thread; its in-session `app_mention` subscription will deliver the user's mention to it. `terminate-session` immediately.
3. **Awaiting-clarification signal** — the bot user has the `:thinking_face:` *awaiting-clarification* reaction on the root and `:white_check_mark:` is NOT present.

   The prior session posted a clarifying question in Step 2.5 and is alive, waiting for the OP to reply. Its in-session subscriptions will deliver any reply or `app_mention` directly to it; the 60-second take-over wait in case 4 must NOT fire here, because the wait for clarification can last hours or days. `terminate-session` immediately, silently — do not post a message and do not add further reactions. (When the OP eventually replies, the alive session re-enters Step 2.5 once via the event-loop skill's clauses `a`/`e` `clarification_asked` pre-check, the one-round cap dispatches into Classify and Act, and the thread ends with `:white_check_mark:`.)
4. **Take-over signal** — `:eyes:` is present but BOTH `:white_check_mark:` AND `:thinking_face:` are absent.

   Either the prior session is mid-investigation (the settled reaction lands at the end of the initial triage, which can take a few minutes) or it crashed before getting there. To avoid stealing a thread that's still in flight, sleep ~60 seconds and re-read the reactions once. If `:white_check_mark:` or `:thinking_face:` has appeared, stand down per case 2 or case 3. Otherwise take over: do NOT add another `:eyes:`, continue to the Subscribe phase with `root_ts` set, and treat the user's mention text as the next instruction.

Throughout Path B, the user's mention text is the instruction to act on once you reach the action / loop step; it may be a follow-up question or a request to update the ticket. Add the `:white_check_mark:` settled reaction yourself at the end of your own initial triage so a later recovery sibling can use the same signal.

## Step 1.5: Acknowledge in-thread

Once you own the thread (Path A success in Step 1A, or Path B take-over per Step 1B case 4), post one short ack reply in the thread so the poster knows the bot picked the message up. Post `:mag: investigating` on its own line — no classification preview, no labels, no footer. The event-loop pre-checks (`<MARKER_COMMENT>` / `<TICKET_FILED_REPLY>` self-detection) already exclude bot-authored messages from re-triggering the loop, so the ack is safe to post unconditionally on these branches.

Skip the ack on any branch that stands the session down without otherwise posting (Path A `already_reacted`, Path B cases 2 / 3, and Path B case 4 falling back to case 2 or 3) — those branches call `terminate-session` immediately and there is no thread for the bot to talk into.

## Step 2.5: Research pass and information-sufficiency check

Runs after the subscribe phase and BEFORE the consumer-owned Classify and Act steps. The goal is twofold: settle threads without filing tickets when the answer can be derived from the codebase, and make sure tickets that *are* filed carry enough detail to act on.

**A. Research pass.** Spend up to 3 codebase / knowledgebase / web searches (counted against the anti-rabbit-hole budget) to determine whether the root message is (i) an open question you can answer from the codebase, (ii) expected behavior or user error, (iii) a known-and-already-tracked issue.

- If you can answer or explain with confidence → post the answer in the thread (mrkdwn-formatted), add the `:white_check_mark:` settled reaction to the root (`already_reacted` is fine), and return to the event loop. **Do NOT** classify, **do NOT** file a downstream ticket. The answer settles the thread.
- If 3 searches yield no confident conclusion → proceed to B.

**B. Information-sufficiency check.** Re-read the root + any thread replies and decide whether you have enough to (i) write a ticket title, description, and (for bug reports) a usable repro, AND (ii) pick a single bucket from the consumer's Classify taxonomy with confidence. Bucket ambiguity counts as insufficient information — if the message could plausibly land in two buckets (e.g. bug report vs feature request, feedback vs question) and the disambiguator isn't in the thread, treat it the same as missing detail.

- If yes → behaviour depends on the `<DEFAULT_BEHAVIOR>` value in your context block:
  - `proactive` → proceed to the consumer's Classify section to determine the ticket category, then file the ticket per the consumer's Act section (which must satisfy the Step 4 ticket action contract below) and stand down.
  - `reactive` → run the consumer's Classify section to pick the category, then post ONE short triage-summary reply in the thread (mrkdwn-formatted, 2–4 lines: the proposed category from the taxonomy + a one-sentence evidence line + an invitation along the lines of "Reply *please file this* — or @-mention me — if you'd like me to open a ticket."). Do NOT call the downstream ticket API. Add the `:white_check_mark:` settled reaction to the root (`reactions.add(channel: <root_channel>, name: "white_check_mark", timestamp: <root_ts>)`; `already_reacted` is fine) and return to the event loop. A downstream ticket will only be filed if a human in the thread later explicitly asks — the event-loop pre-check in clauses `a` / `e` dispatches into the consumer's Act section per the Step 4 ticket action contract at that point.

  Fixer mode is not entered from Step 2.5 in either mode — it requires an explicit human ask in the thread and is dispatched from event-loop clauses `a` / `e` (see the event-loop skill's clause `f`).
- If no → post ONE focused clarifying question in the thread (mrkdwn-formatted, asking the single most important missing detail — or the single most important disambiguating question if the gap is bucket-selection rather than missing detail). Add the `:thinking_face:` *awaiting-clarification* reaction to the root (`reactions.add(channel: <root_channel>, name: "thinking_face", timestamp: <root_ts>)`; `already_reacted` is fine) so a later Path B recovery sibling can see this thread is waiting on the OP and stand down without re-running Step 2.5 from scratch — the 60-second take-over heuristic in Step 1B is calibrated for minutes-of-investigation, not the hours/days a clarification wait can take. **Do NOT** add `:white_check_mark:` (thread is not settled). Save `clarification_asked: true` in scratch space and return to the event loop. The event loop's new-reply clause (and the `app_mention` clause) will wake the session when the OP replies; on wake, re-enter Step 2.5 once. Do not remove the `:thinking_face:` reaction on re-entry — it remains alongside `:white_check_mark:` once the thread settles, as a historical marker that clarification was requested.

**One-round cap.** If `clarification_asked` is already `true` when you enter Step 2.5 a second time, skip B's sufficiency-check sub-step and proceed directly to the "if yes" branch above (whose action depends on `<DEFAULT_BEHAVIOR>`) with whatever info is now present — record gaps in the ticket description (proactive) or the triage-summary reply (reactive) as "open questions" rather than blocking on a third round.

## Step 3.5: Re-check thread context before acting

Triage work (codebase search, downstream ticket-system search, drafting a reply) can take several minutes. During that time, teammates may post replies that explain the issue, answer the question, or change what the right action is. Any classification you produced earlier was based on the root message only — it may be stale.

Immediately before posting a Slack reply OR creating a downstream ticket, call `conversations.replies` on the thread (`channel: <root_channel>`, `ts: <root_ts>`) and re-read the full thread. Then decide:

- **A teammate already answered the question** → do not post your answer. Add a `:eyes:` reaction to the root message (idempotent — `already_reacted` is fine) and stop the triage action.
- **A teammate already explained the cause of the bug, identified it as expected behavior / user error, or linked an existing tracked ticket** → do NOT file a new ticket. If an existing ticket was linked, reply with the `<TICKET_FILED_REPLY>` prefix variant your bundle uses for "linked to existing" and stop. Otherwise just stop.
- **A teammate asked the original poster for more info and is still waiting** → do not interject. Stop the triage action.
- **The replies change the nature of the ask** (e.g. reveal a feature request inside a bug report) → re-classify and act on the new category.
- **The replies add useful context but the action is still needed** → proceed, and incorporate the reply context into the ticket description.

When in doubt, prefer to stand down rather than post a reply that contradicts or ignores what teammates have already said. "Stop the triage action" means: do not file a ticket and do not post a triage confirmation, but stay in the session — the event loop will still process subsequent thread events.

Whenever you stand down here without filing a ticket (the *already answered*, *linked existing*, and *mid Q&A* cases above), add the `:white_check_mark:` settled reaction to the root message before returning to the event loop (`reactions.add(channel: <root_channel>, name: "white_check_mark", timestamp: <root_ts>)`; `already_reacted` is fine). This is the positive *initial-triage-finalized* signal recovery siblings key off; without it, a channel-wide `app_mention` recovery trigger fired later can think your session crashed and hand the same `app_mention` to a sibling, leading to duplicate replies.

## Step 4: Ticket action contract

Regardless of which downstream system you use (Linear `issueCreate`, GitHub `POST /repos/.../issues`, Jira create-issue, etc.), your ticket-filing implementation MUST follow the contract below. The recovery branch (Step 1B) and the event-loop step (edits, deletes, recovery `app_mention`s) all depend on it.

**Reaction conventions on the root message (canonical list — all other steps reference these):**

- `:eyes:` — *claimed.* Added in Step 1A by the session that wins the claim race. Recovery siblings without `:white_check_mark:` or `:thinking_face:` may take over after the 60-second wait in Step 1B case 4.
- `:thinking_face:` — *awaiting clarifying reply.* Added in Step 2.5 sub-section B's "if no" branch when the session posts a clarifying question and parks for the OP. Tells Path B recovery siblings to stand down silently (Step 1B case 3); the 60-second take-over wait must not fire while this reaction is present, because the wait for clarification can last hours or days.
- `:white_check_mark:` — *settled.* Added by the session that finalizes the initial triage decision (filed a ticket per Step 4 below; stood down without filing per Step 3.5; or posted the Step 2.5 reactive-mode triage-summary reply without filing). Path B recovery siblings stand down on this signal (Step 1B case 2).

- **Embed `<MARKER_COMMENT>` verbatim in the ticket description**, as a literal HTML comment. The recovery step uses it for self-detection; without it, recovery cannot tell whether a sibling session already triaged the thread.
- **Post a Slack reply starting with the `<TICKET_FILED_REPLY>` prefix** (one prefix per outcome — e.g. `*Bug filed* :bug:`, `*Feature request filed* :sparkles:`, `*Linked to existing* :link:`). Recovery and event-loop self-detection both anchor on the prefix; rephrasing it across replies breaks both.
- **Include a Slack permalink to the root message in the ticket description** (see the included permalink skill below). Use the permalink — not just the ts — so the ticket is one click from the thread for the human triager.

  <include src="kb://skills/slack/thread-permalink.md" mode="lazy" />

- **Remember the created ticket's `id` and human identifier** (e.g. Linear `issue.identifier = AU-12345`) in your scratch space. Subsequent edits, comments, and cancellations all need it; you cannot reliably re-derive it from the ticket-system search later because title-rephrasing makes keyword search lossy.
- **Duplicate-search before filing**, scoped to the downstream system's project / repo / board. Inspect the top 5–10 hits semantically (not just by exact-title match) before deciding to file new vs sub-issue / link. If unsure, file new — duplicate merging is cheaper than missing a real report.
- **Add the `:white_check_mark:` settled reaction to the root message** after the `<TICKET_FILED_REPLY>` reply is posted (`reactions.add(channel: <root_channel>, name: "white_check_mark", timestamp: <root_ts>)`; `already_reacted` is fine). Together with the `:eyes:` claim reaction, this tells a `app_mention` recovery sibling that the initial triage decision is finalized for this thread and it should stand down. The `<TICKET_FILED_REPLY>` / `<MARKER_COMMENT>` pair alone is no longer sufficient: stand-down branches of Step 3.5 don't post a `<TICKET_FILED_REPLY>` either, so the settled reaction is the single positive signal both branches share.

## Reply-style invariants

These apply to every reply this session posts in the thread, regardless of which step is posting.

- **Reply only when there is a direct question for the bot in the thread, or when an initial-triage action requires posting** (the `<TICKET_FILED_REPLY>` confirmation, the Step 1.5 ack, the Step 2.5 clarifying question, an answer-from-codebase post in Step 2.5 Section A, the Step 2.5 reactive-mode triage-summary reply, or a Step 3.5 *linked existing* stand-down reply). Do not respond to every new message in the thread — most replies (`:thumbsup:` reactions, "thanks", side-conversation between teammates) need no acknowledgement from the bot.
- **Do not @-mention or otherwise tag users in Slack replies.** Use plain names instead when a human name is necessary.
- **Keep replies concise.** Triage confirmations, stand-down replies, and the Step 1.5 ack should run 2–4 lines. Clarifying questions should be a single focused sentence. Question answers (Step 2.5 Section A) may run longer when the answer genuinely requires it, but skip preamble and explanation of process — answer the question, link the relevant code or doc, stop.
