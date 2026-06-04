---
name: github-fetch-pr-reactions
description: Fetch reactions and reply threads on PR comments and review submissions, with reply sentiment classification (agreed / disagreed / discussed). Used by post-hoc analyzers of human signal on a PR (e.g. memory data collectors).
---
# Fetch reactions and replies

For each comment or review submission of interest, fetch its reactions and any reply thread.

## Reactions

- **Inline review comment:**
  `GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions`
- **Top-level (issue) comment:**
  `GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions`

Review submissions (the `pull_request_review` object) have no reactions endpoint in the GitHub REST API — skip them. If a reviewer wants to signal agreement on the review as a whole, the human-visible surface for that is a reaction on the review's summary comment (which is a top-level issue comment if posted that way) or on individual inline review comments; both are covered above.

Tally by content. The reactions that carry signal are 👍 (`+1`) and 👎 (`-1`); 🚀 / 🎉 / ❤️ are noise for review-quality purposes. Skip reactions from bot accounts.

## Replies

Inline review comments form threads via `in_reply_to_id` — walk the comments list and collect every comment whose `in_reply_to_id` points at the comment you're examining. Top-level issue comments don't thread; treat each one as standalone.

Skip replies authored by bots — only human replies carry signal.

## Reply sentiment

Classify each human reply by its content into one of three buckets:

- **`agreed`** — the reply confirms the finding. Examples: "good catch", "fixed", "thanks", "you're right", "addressed in {sha}".
- **`disagreed`** — the reply rejects the finding. Examples: "this is intentional", "not a bug", "false positive", "by design".
- **`discussed`** — the reply engages without clear agreement or disagreement. Examples: "what about …", "can you clarify", "have you considered …".

When a thread has multiple replies from the same user, classify on the most recent one — replies escalate or resolve, and the latest is the live signal.
