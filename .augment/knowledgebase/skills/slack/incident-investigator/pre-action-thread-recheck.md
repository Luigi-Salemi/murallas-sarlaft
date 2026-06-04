---
name: incident-investigator-pre-action-thread-recheck
description: Pre-action staleness gate — before any in-thread post or worker launch, re-read the thread and decide whether to suppress, revise, or proceed, so the action is not taken after teammates have already covered, contradicted, or withdrawn it.
---

You are about to act in the thread — post a message or launch a worker (the calling step says which). Replies can land while you prepare it, so before you act, work through the steps below: fetch the replies that arrived since your last read and decide whether the action still fits.

1. Call `conversations.replies(channel: <root_channel>, ts: <root_ts>)`.
2. Look only at messages that arrived after the last time you read this thread for this step — the ones that landed while you were preparing. Ignore sibling AI agents (named in the adopting bundle's *Sibling agents* section) and the `<incident-management-platform>` bot.
3. From the remaining human messages, pick one outcome. The examples illustrate each case but are not exhaustive. If you cannot decide between **Suppress** and **Proceed**, choose **Suppress**: staying silent costs little — the next reply wakes you again — while a duplicate, contradictory, or unwanted action cannot be taken back.
   - **Suppress** — the action would no longer help the on-call. For example: a teammate already posted the same finding; the reporter called it off (`nvm` / `false alarm` / `we got it`); someone linked an existing ticket, PR, or post-mortem for the same root cause; the human withdrew the fix selection or said they will handle it themselves. Skip the action and go back to waiting.
   - **Revise** — the thread has moved on, so the action as planned is now wrong, incomplete, or misleading. For example: a teammate added contradicting evidence, corrected a fact you relied on (service name, error code, owner, selected fix option), or gave context that changes your recommendation. Reshape the action to fit the new messages (the calling step says how), then take it. Do not re-run this gate in a loop — if another reply lands while you reshape, it wakes a fresh turn that runs this gate again.
   - **Proceed** — nothing substantive from a human, only reactions, thanks, or side-chatter. Take the action as planned.
