---
description: Surface-aware notification rules for PR-monitoring agents — when and where to notify the PR owner.
---

Notify on two surfaces:

1. **PR comment** — post a comment on the pull request using whatever code-hosting tool is available. Visible to reviewers, CI bots, and anyone watching the PR. If the comment fails (API error, missing permissions), skip it — the session message is the reliable fallback.
2. **Session message** — end the turn with an assistant message summarizing the milestone. The session runtime automatically relays this message to wherever the session was launched from (e.g. a messaging thread). No extra tool is needed — the relay is built into the platform. This surface always works.

When to notify (milestone → surfaces):

| Milestone | PR comment | Session message |
|-----------|-----------|-----------------|
| **PR opened** | ✅ intro comment | ✅ one-liner: PR URL + what it does |
| **Lifecycle** (Reviewing → Blocked / Ready for review) | ✅ single edit-in-place comment, see below | ❌ on `🔄 Reviewing` / `✅ Ready for review` entries; ✅ one-liner on each fresh `❌ Blocked` entry from a non-blocked state |
| **CI passed** | ❌ | ❌ |
| **Ready to merge** | ✅ gate evidence | ✅ one-liner: PR URL + "ready to merge" |
| **Stale review nudge** | ✅ @-mention reviewers | ❌ |

When NOT to notify:
- Routine progress (pushed a commit, responded to a comment). Only notify for milestones.
- **Acknowledgment of human commands.** When a human posts a command or instruction on the PR, act on it — do not post a comment confirming you received it.
- **Echoing another agent's output.** If a bot (code review, risk analyzer, verifier) just posted a comment, do not post a separate comment summarizing what it said. The bot's comment is already visible.

**@-mention discipline:** `@username` fires a notification at that user — reserve it for cases where their **action is required**. Do not `@-mention` someone when you are merely *referring to* them. Concretely:
- **Inline reply on their own thread:** never `@-mention` the parent commenter. The inline reply already notifies them — adding `@username` doubles the notification for no extra signal. If the reply also needs the PR owner's input, `@-mention` only the owner.
- **Status / summary lines** ("Approved by …", "Reviewed by …", "Requested from …"): use the plain username or a link to the review — not an `@-mention`. The reviewer already finished their job; the line is informational for the PR owner.
- **Allowed @-mentions:** the PR owner on blocker / ready-to-merge / unblocked comments, and assigned reviewers on the stale-review nudge (both action-required). Nothing else.

**Session message format (strict):** Session messages are relayed to Slack/messaging. They must be **one sentence** — the PR URL and the key fact. No explanations, no gate details, no quoting other agents. Examples:
- `PR opened: <URL> — adds retry logic to payment service.`
- `Blocked: <URL> — Deep Code Review requests changes.`
- `Ready to merge: <URL> — CI green, approved, verification passed.`

**PR comment length**: blocker and milestone comments should be ≤ 4 lines. Do not re-explain what another agent or CI already posted — refer to it by name. If the owner needs options, list them as a one-line bullet each, not full paragraphs.

## Lifecycle comment

After the intro comment, the monitoring agent maintains exactly **one** lifecycle comment per PR that is edited in place as gates progress. The headline reflects the current state. (Today only the PR Author expert consumes this section; the policy is written to be reusable.)

**When to first post.** Post the lifecycle comment the moment the PR is non-draft (either opened ready, or transitioned from draft via `ready_for_review`). Do not wait for CI or other gates.

For the purposes of the state triggers below, **blocking gates** are CI, the verification gate, and the code-review gate. The risk-analysis gate is **informational-only** per adaptive-gates and never moves the comment into `❌ Blocked` or keeps it out of `✅ Ready for review`, regardless of its verdict.

**State 1 — `🔄 Reviewing`** *(any blocking gate is still running, or the 10-min adaptive-gates window since the gate-triggering event has not yet elapsed)*. List CI status and any gate that has posted a signal, marked as `running` or with its verdict.

```
🔄 Reviewing on `<sha>`:
- ✅ CI green
- 🔬 End-to-End Verifier — running
- 🛡️ Risk Analyzer — running
```

**State 2 — `❌ Blocked`** *(any blocking gate failed, requested changes, or returned an inconclusive verdict; or CI failed)*. Edit the headline and append a one-line `@<owner>` action line. Do not repeat the gate's own findings — refer to its comment by name. If multiple gates block, list each on its own line.

```
❌ Blocked on `<sha>`:
- ✅ CI green
- ❌ Verifier failed

@<owner> please take a look — see the Verifier comment above.
```

On every fresh entry into `❌ Blocked` from a non-blocked state, fire the session-message one-liner (`Blocked: <URL> — <gate name>`). Do not fire the session message again while the comment stays in `❌ Blocked`.

**State 3 — `✅ Ready for review`** *(CI green, every blocking gate that posted any signal has a passing terminal verdict, and the 10-min adaptive-gates window has elapsed)*. Edit the headline and add the reviewer-handoff sentence. Any informational-only gate (e.g. Risk Analyzer) is listed with its verdict but does not gate this transition. If reviewer assignment is opted in per the Handoff Policy, run the Reviewer Assignment Policy fallback chain now and name the requested reviewers in the same comment.

```
✅ Ready for review on `<sha>`:
- ✅ CI green
- ✅ Verifier passed
- 🛡️ Risk Analyzer — human input needed (informational)

Reviewer pick is your call — I won't request anyone myself.
```

**Gates that never posted any signal** during the 10-min window are silently omitted from the comment body. Never write `➖ not configured` or similar language for them.

**Recovery transitions.** If a new push fixes a previously failing gate, the headline edits back through the states (`❌ Blocked` → `🔄 Reviewing` → `✅ Ready for review`) as signals re-settle. Each fresh entry into `❌ Blocked` from a non-blocked state fires a new session-message one-liner.

## Stale review nudge

If reviewers have been assigned but no review activity (comments, approvals, or change requests) appears within **24 hours**, post **one** comment on the PR @-mentioning the assigned reviewers and end the turn with a session message mentioning the owner (action required). Do not nudge again — the owner has been notified and can follow up themselves. Skip the nudge entirely if any reviewer has already submitted a review.

The agent has no timer. This check runs as a **side effect on every wake-up** — whenever the agent processes a comment event (Phase 3) or a worker report (Phase 4), it also checks whether the nudge is due. The status-poll worker sends reports every 1–3 hours, guaranteeing periodic wake-ups even when no other events arrive.
