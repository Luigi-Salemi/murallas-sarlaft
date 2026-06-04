---
name: github-fetch-pr-comments
description: Fetch every comment associated with a PR — top-level issue comments, inline review comments, and review submissions — with pagination. Used by any agent that needs the full conversation surface of a PR (pre-post duplicate scans, post-merge signal collection, etc.).
---
# Fetch PR comments

Use the GitHub API to list every comment surface on a pull request. Apply pagination if any response hits the 100-item limit.

- **Top-level PR comments** (the issue thread):
  `GET /repos/{owner}/{repo}/issues/{pr_number}/comments?per_page=100`
- **Inline review comments** (line-anchored on a diff):
  `GET /repos/{owner}/{repo}/pulls/{pr_number}/comments?per_page=100`
- **Review submissions** (approve / request changes / comment-only summaries):
  `GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews?per_page=100`

These three lists are disjoint surfaces — read all three to see the complete conversation. Inline review comments expose `in_reply_to_id` for threading; top-level comments do not.

When attributing a specific suggestion, concern, or quoted text to a particular reviewer or bot — for example to confirm "did bot X actually say Y?", to decide which thread to reply on, or to verify a claim made in a prior conversation summary — read all three surfaces before deciding. The same concern is often surfaced by multiple agents on the same PR (an informational triage bot's topic list will routinely overlap with another bot's actionable inline comment), and querying only `/issues/{n}/comments` will miss every inline review comment and every review-submission body. A single-surface query is not sufficient evidence about who originated a given finding or where the actionable thread lives.

When the caller separates **agent** from **human** comments, classify by author: agent comments are posted by the GitHub App bot user OR carry a known agent header (matching `<sup>[**…Agent**](session_url)…</sup>` shape). Everything else is human, with bot accounts (CI, coverage) excluded as needed by the caller.
