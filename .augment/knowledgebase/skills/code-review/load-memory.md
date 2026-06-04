---
name: code-review-load-memory
description: Code-review-specific binding for the generic memory load skill. Sets TEAM=code-review and SCOPE={owner}/{repo}, and specializes the matcher and citation guidance for PR review (file-path globs against PR changed files, surfacing anti-patterns as findings).
---
# Load review memory

Bindings for the included generic memory skill:

- `{TEAM}` = `code-review`
- `{SCOPE}` = `{owner}/{repo}` resolved from the PR being reviewed.

Code-review specializations of the generic rules:

- The `##` headings in `knowledge/{owner}/{repo}.md` are **file-path globs** (e.g. `## services/billing/**`). Matching means: a heading matches when **any of the PR's changed files** match the glob.
- Treat anti-pattern detection as **findings** in the review output. Reference the learning in the finding's description to explain why the pattern is problematic.
- When citing a learning that contradicts the diff, surface the discrepancy to the **human engineer (or the PR author in the review output)** rather than silently ignoring either signal.

<include src="kb://skills/memory/load-memory.md" />
