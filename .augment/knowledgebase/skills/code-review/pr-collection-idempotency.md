---
name: code-review-pr-collection-idempotency
description: Code-review-specific binding for the generic memory pr-collection-idempotency skill. Sets TEAM=code-review and SCOPE={owner}/{repo} so the dedup scan runs against `breadcrumbs/{owner}/{repo}.md` and treats the PR URL as the canonical anchor.
---
# Code-review PR-collection idempotency

Bindings for the included generic pr-collection-idempotency skill:

- `{TEAM}` = `code-review`
- `{SCOPE}` = `{owner}/{repo}` resolved from the PR being collected.

Code-review specializations:

- The "in-session human-feedback" sections referenced in step 4 are written by Pair Reviewer flows via the `code-review-feedback-capture` skill. When found, quote their prose verbatim in the new PR-summary section the calling expert (the data collector) appends.

<include src="kb://skills/memory/pr-collection-idempotency.md" />
