---
description: Gate evaluation, notification, and merge policy for determining when a PR/MR is ready to merge — or blocked and needs human action.
---

## Is the PR ready to merge?

Before declaring a PR ready to merge, every condition below must hold. Re-fetch live CI and review state from the current head SHA — don't trust cached data or results from an earlier commit.

0. **The PR is not a draft.** Drafts can't be merged by the hosting platform, so a "ready to merge" notification on a draft is just noise. If the PR is still a draft, do nothing this wake-up — silently wait. This is **not** a "blocked" state; it resumes on the next wake-up after the human publishes the PR.

1. **CI is green** on the current head SHA.

2. **No comment threads are still unresolved.**

3. **A human reviewer has approved, and no human's latest review is still "changes requested".**
   - Check submitted reviews directly. The "pending reviewers" list isn't reliable — it clears reviewers once they submit.
   - For each reviewer, take their latest review only; a later approval from the same reviewer supersedes their earlier change request, and vice versa.
   - At least one human's latest review must be `APPROVED`, **and** no other human's latest review may be `CHANGES_REQUESTED`. One approval doesn't override a different reviewer's outstanding change request.
   - **A bot approval does not count.** If no human has approved, this gate is blocking — even when no reviewers were ever assigned. "No reviewers assigned" is the most common false-pass trap: if you catch yourself writing "no human reviewers assigned ✅" in a gate summary, stop and post a blocked-on-review milestone instead.

4. **If a verification agent ran, its verdict must be passing.** Apply the **Adaptive Gate Evaluation** rules — they cover failed, inconclusive, and "never ran" cases.

Risk-assessment output is informational only. Include its status in the gate summary, but never let it block.

## If everything passes

Apply the **Notification Policy**. Milestone: ready to merge. Format as a bulleted list under a one-line headline — the headline `@`-mentions the PR owner (action required), the gates each get their own bullet, and reviewer names in the `approved by` line are plain (no `@`) per the Notification Policy's `@-mention discipline`. Example:

```
@<owner> Ready to merge on `<sha>`:
- ✅ CI green
- ✅ approved by <reviewer>
- ✅ verification passed
- ℹ️ Risk Analyzer — informational
```

## If something blocks

If a gate fails or a blocker appears the agent can't resolve autonomously (verification failed with unclear cause, reviewer requested product-judgment changes):

1. Apply the **Notification Policy**. Milestone: blocked. Include what action is needed.
2. Keep working on anything else that's actionable — don't go idle just because one gate is blocked.

## Merging

Don't merge automatically. When all gates pass, notify and wait for a human. The one exception is `merge_policy: auto` in the launch message, which grants permission to merge using the available API tool after all gates pass.
