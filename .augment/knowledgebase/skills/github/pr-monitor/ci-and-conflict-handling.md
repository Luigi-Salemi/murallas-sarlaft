---
name: github-pr-monitor-ci-and-conflict-handling
description: Handler for status-poll worker reports. Diagnoses CI failures, resolves merge conflicts, brings the PR up to date with its base branch, and tracks state transitions.
---
# Worker Reports

When you receive a `<worker>` message from the status-poll worker, handle based on the status field:

- **`ci_failure`**: The worker detected CI failures (via webhook or polling fallback). Fetch full CI details for the current head SHA:
  1. `GET /repos/{owner}/{repo}/commits/{sha}/check-runs`
  2. `GET /repos/{owner}/{repo}/commits/{sha}/status`

  For each failure: read the check name/context and any available output, diagnose the issue, and push a fix. After pushing, CI will re-run and the worker will notify you again if it fails.

  Stop retrying and escalate (see below) if the failure isn't fixable from this PR — e.g., a legacy/misconfigured check, a check whose config lives outside the repo, or an infra flake with no actionable signal — or if you've already tried to fix the same failure multiple times.

- **`action_needed` (merge conflict)**: Resolve only if the intent of both sides is unambiguous and push the fix; otherwise escalate.

- **`action_needed` (behind base branch)**: Merge the base branch into the PR branch to bring it up to date. If the merge succeeds cleanly, push the result. If it introduces conflicts, handle as a merge conflict (above).

- **`ci_success` / `all_checks_passed`**: The worker reports all CI checks have passed. Evaluate all gates per the **Adaptive Gate Evaluation** rules. If Phase 5 conditions are met, advance to **Phase 5**. If Phase 6 conditions are met, advance to **Phase 6**. If a hard gate is blocking (e.g., verification failed, reviewer requested changes), apply the **Notification Policy** with milestone: blocked.

- **`state_change` (idle transition)**: Update your internal state tracking. No action needed.

- **`state_change` (dormant transition)**: Post a comment on the PR: "This PR appears to be inactive. The agent will stop monitoring until a new comment is posted." (Prepend the comment header.) Update your internal state tracking.

## Stale review check (on every wake-up)

After handling the worker report, check whether a stale-review nudge is due. This is a side effect on every wake-up because the agent has no timer:

1. If reviewers have been assigned, fetch review activity: `GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews`.
2. If any reviewer has submitted a review (approve, comment, or request-changes), skip — no nudge needed.
3. If no review activity exists, no nudge has been posted yet, and the oldest reviewer-request event is older than **24 hours**, apply the **Notification Policy** with milestone: stale review nudge. Only nudge once — if a nudge was already posted, do not post another.

## Escalation

You have no `ask-user` tool. To escalate, `POST /repos/{owner}/{repo}/issues/{pr_number}/comments` (with the comment header) — be concrete about which check or files, what you tried, and what you want the human to do — then end the turn and wait. Never write a wrap-up sentence claiming you asked for help unless this turn actually posted that comment.

End with a short, human-friendly sentence describing the outcome — e.g., "Pushed a fix for the failing `lint` check." or "Posted a comment asking whether the failing `claude-review` check can be ignored." No need to repeat the PR URL on every event; it was surfaced at initialization.
