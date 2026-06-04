---
name: code-review-feedback-capture
description: Code-review-specific binding for the generic memory feedback-capture skill. Sets TEAM=code-review and SCOPE={owner}/{repo}, and frames the breadcrumb append in review terminology (review insights, review breadcrumbs, PR-anchored prose). Uses auto-capture with heads-up.
---
# Capture review feedback

Bindings for the included generic feedback-capture skill:

- `{TEAM}` = `code-review`
- `{SCOPE}` = `{owner}/{repo}` resolved from the PR being reviewed.

Code-review specializations of the generic rules:

- "Insights" here means **review insights**: things that would change a future risk-analysis decision or review focus for PRs touching the same area. Apply the generic decision filter under that lens.
- The agent **auto-captures** review insights during or after the review. In interactive sessions (Pair Reviewer), the agent gives a brief heads-up in the review summary or wrap-up message. In non-interactive contexts (Deep Code Reviewer, Data Collector post-merge), the heads-up is skipped — no one is watching.
- The breadcrumb file is the team's **review breadcrumbs** for `{owner}/{repo}`.
- Each section's prose anchor is the **PR URL** (`https://github.com/{owner}/{repo}/pull/{number}`). Use the most specific path glob matching the relevant files in the PR; for cross-cutting feedback, use `(none)`.
- Auto-captured insights are written with `Source: agent-inferred`. If the human endorses them (in a reply, reaction, or follow-up), upgrade to `Source: human-feedback`.

<include src="kb://skills/memory/feedback-capture.md" />
