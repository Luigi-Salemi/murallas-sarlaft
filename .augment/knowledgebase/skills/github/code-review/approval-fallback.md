---
name: github-code-review-approval-fallback
description: Three-step fallback for posting an approving review when the bot account cannot approve its own PR — try `github-app-api`, fall back to `github-personal-api`, and surface the failure to the human if both fail.
---
# Approval Fallback

When approving a PR (whether during initial review or after monitoring), use this fallback sequence. The bot account (`github-app-api`) cannot approve PRs that it created, so the agent must handle this gracefully.

1. **Try bot approval first** (`github-app-api`):
   Post an approving review using `github-app-api`:
   ```
   POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews
   {"event": "APPROVE", "body": "<verdict text>"}
   ```
   If this succeeds, the approval is complete.

2. **If bot approval fails** (e.g., the PR was created by the bot account), **try user approval** (`github-personal-api`):
   Post the same approving review using `github-personal-api` instead. If this succeeds, the approval is complete. Note in the verdict that it was posted under the user's account because the bot account could not approve its own PR.

3. **If both fail**, clearly notify the human engineer:
   ```
   ## ⚠️ Manual Approval Required

   I was unable to approve this PR programmatically:
   - Bot account (github-app-api): [error reason, e.g., "cannot approve own PR"]
   - User account (github-personal-api): [error reason, e.g., "insufficient permissions" or "tool not available"]

   Please approve the PR manually on GitHub:
   {PR URL}
   ```
   Do NOT silently skip the approval — always inform the human engineer.
