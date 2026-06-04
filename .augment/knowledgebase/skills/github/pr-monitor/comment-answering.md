---
name: github-pr-monitor-comment-answering
description: Question-answering loop for a PR-monitoring agent. Filters incoming GitHub comment events, classifies them, and responds (answer, implement-and-push, or acknowledge).
---
# PR Comment Answering

You are subscribed to GitHub notifications on the PR. When you receive a comment or review event (`issue_comment`, `pull_request_review_comment`, or `pull_request_review`), proceed through the steps below.

## Step 1: Reactivate if needed

<include src="kb://skills/github/pr-activity-states.md" mode="lazy" />

If the agent is currently in **Idle** or **Dormant** state, a new comment means the PR is active again. Send a message to the status-poll worker to reactivate:

```
reactivate: PR has new activity, transition to active state
```

If already in **Active** state, skip this step.

## Step 2: Filter

<include src="kb://skills/github/self-detection.md" mode="lazy" />

Ignore comments and reviews that should not receive a reply:
- Comments authored by this agent (match the link target in the comment header against your session URL)
- Pure status notifications (CI results, deploy status, coverage reports) — but NOT bot comments containing code review feedback (suggestions, change requests, bug reports)
- Comments clearly directed at another person and not the on-behalf-of user named in your context
- `pull_request_review` events with an empty or whitespace-only `review.body` — the actionable content (if any) is in the per-inline `pull_request_review_comment` events for the same review; treat these as a no-op to avoid double-handling. An `APPROVE` review with no body is also a no-op here; if an acknowledgment is desired, the review-comment events for the same submission already cover that.
- Comments and reviews from the **PR Risk Analyzer** expert — recognizable by a body starting with `**PR Risk Analysis 🛡️ · Low Risk**` or `**PR Risk Analysis 🛡️ · Human Input Needed**`. These can arrive as an `issue_comment` (Human Input Needed case, or the Low Risk fallback when GitHub rejected the approving review) or as a `pull_request_review` body (Low Risk APPROVE). They are informational triage output for human reviewers; do not reply or implement anything in response. A Risk Analyzer "Human Input Needed" topic list often overlaps in subject matter with concrete inline suggestions filed by other bots (e.g. Deep Code Review) on the same PR — never use a Risk Analyzer topic as evidence about who originated an actionable suggestion or where the actionable thread lives; verify against the inline review comments themselves.

If the comment / review should be ignored, skip to Step 4.

## Step 3: Respond to the comment

<include src="kb://skills/github/comment-header.md" mode="lazy" />

Determine the type of comment and respond accordingly using the github tool. Remember to prepend the comment header to every comment you post.

- **Question about the PR**: Answer the question by posting a reply comment.
- **Change request or code suggestion**: Implement the requested changes, commit, and push, then reply on the originating comment confirming what you changed — **all in the same turn as the push**. Do not defer the reply to a later turn or wait for the user to prompt; a pushed commit without an accompanying reply on the source thread counts as silently ignoring the suggestion. If you decide not to implement a suggestion, you MUST still reply in the same turn explaining why. Never silently ignore a suggestion.
- **Named intent defined by your expert**: If the expert prompt defines a handler for a specific comment body (e.g. PR Author's `mark ready` draft-promotion intent), and the comment body matches that intent exactly (case-insensitive, ignoring the header line), invoke the handler defined in the expert prompt instead of treating the comment as a question. The recognizer lives here; the mechanics live in the expert.
- **General feedback or approval**: Reply with a brief acknowledgment if appropriate.

Reply in **exactly one venue per source event** — the venue is determined by the event type, never by the size or scope of your response. Do not supplement an inline reply with a top-level "summary of changes" comment, and do not supplement a top-level reply with extra inline replies on lines that did not have inline comments. One source event → one reply, in the matching venue:

- `issue_comment` → top-level reply on the PR. Do not also post inline replies on the diff.
- `pull_request_review_comment` → inline reply on the review thread. Do not also post a top-level "summary" comment on the PR, even when the change you pushed is large, addresses several points, or feels like it deserves a higher-level recap. The inline reply IS the complete response.
- `pull_request_review` (with non-empty `review.body`) → top-level reply on the PR addressing the summary body. If the review is `REQUEST_CHANGES` and lists concrete changes only in the summary (no inline comments), implement them, push, then reply confirming what changed. Inline comments belonging to the same review submission arrive as their own `pull_request_review_comment` events and are answered inline there — do not duplicate them at the top level.

If multiple source events arrive close together (e.g. several inline comments from a single review), handle each one in its own venue per the rule above. The total number of *replies to comment/review events* you post in this step equals the number of actionable source events, not one more. Milestone and lifecycle comments posted under the **Notification Policy** (e.g. ready-for-review, blocked, ready-to-merge updates) are governed by that policy, not by this count — they are not replies to a source event and do not count against this rule.

## Step 4: Check gate advancement

After handling the comment (or skipping it), evaluate whether the PR should advance to the next phase. This is critical — agent gate completions (code review done, verification skipped, risk assessment posted) arrive as comments, and without this check the agent goes idle instead of advancing.

1. Fetch current CI status for the head SHA.
2. Evaluate all gates per the **Adaptive Gate Evaluation** rules.
3. If Phase 5 conditions are met: advance to **Phase 5**.
4. If Phase 6 conditions are met (all merge gates pass): advance to **Phase 6**.
5. If a gate is blocking, apply the **Notification Policy** with milestone: blocked, then continue working on anything actionable.

## Step 5: Stale review check (on every wake-up)

After handling the comment and checking gates, check whether a stale-review nudge is due. This runs as a side effect on every wake-up because the agent has no timer:

1. If reviewers have been assigned, fetch review activity: `GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews`.
2. If any reviewer has submitted a review (approve, comment, or request-changes), skip — no nudge needed.
3. If no review activity exists, no nudge has been posted yet, and the oldest reviewer-request event is older than **24 hours**, apply the **Notification Policy** with milestone: stale review nudge. Only nudge once — if a nudge was already posted, do not post another.

## Step 6: Wrap up the turn

End with a short, human-friendly sentence that says what you did and why — no need to repeat the PR URL on every event (it was surfaced at initialization). For example:
- "Replied to @alice's question about the retry logic."
- "Pushed a commit addressing @bob's suggestion to extract the helper."
- "Skipped a CI status notification from the coverage bot."
- "Code review completed — CI is green, assigning reviewers."

One sentence is plenty; skip narration of the steps you took to get there.
