---
name: github-pr-monitor-init
description: Initialization steps for a PR-monitoring agent. Fetches head SHA, subscribes to GitHub events, launches the status-poll worker, posts the introduction comment, and processes existing comments.
---
# PR Monitor Initialization

Execute these steps immediately and in order. Throughout, `{owner}`, `{repo}`, and `{pr_number}` come from the PR being monitored.

## Step 1: Fetch head SHA

Fetch the PR details: `GET /repos/{owner}/{repo}/pulls/{pr_number}` (with details). Note the `head.sha` — this is needed for the worker launch.

## Step 2: Register event listeners

Subscribe to GitHub events for comments and PR closure. CI failure subscriptions are NOT registered here — they are managed entirely by the status-poll worker.

```json
{
  "subscriptions": [
    {
      "source": "GITHUB",
      "event_type": "pull_request",
      "filter_payload": {"and": [{"==": [{"var": "repository.url"}, "https://api.github.com/repos/{owner}/{repo}"]}, {"==": [{"var": "pull_request.number"}, {pr_number}]}, {"in": [{"var": "action"}, ["closed", "ready_for_review"]]}]},
      "description": "Watch for when the PR is closed/merged or transitioned from draft to ready-for-review"
    },
    {
      "source": "GITHUB",
      "event_type": "issue_comment",
      "filter_payload": {"and": [{"==": [{"var": "repository.url"}, "https://api.github.com/repos/{owner}/{repo}"]}, {"==": [{"var": "issue.number"}, {pr_number}]}, {"==": [{"var": "action"}, "created"]}]},
      "description": "Watch top-level comments"
    },
    {
      "source": "GITHUB",
      "event_type": "pull_request_review_comment",
      "filter_payload": {"and": [{"==": [{"var": "repository.url"}, "https://api.github.com/repos/{owner}/{repo}"]}, {"==": [{"var": "pull_request.number"}, {pr_number}]}, {"==": [{"var": "action"}, "created"]}]},
      "description": "Watch inline code review comments"
    },
    {
      "source": "GITHUB",
      "event_type": "pull_request_review",
      "filter_payload": {"and": [{"==": [{"var": "repository.url"}, "https://api.github.com/repos/{owner}/{repo}"]}, {"==": [{"var": "pull_request.number"}, {pr_number}]}, {"==": [{"var": "action"}, "submitted"]}]},
      "description": "Watch review submissions (approve / request-changes / comment), including reviews whose only content is a summary body and no inline comments"
    }
  ]
}
```

The `pull_request_review` subscription is what catches `REQUEST_CHANGES` reviews and `APPROVE` reviews that have a summary body but no inline comments — those produce no `pull_request_review_comment` events. For reviews that DO have inline comments plus a summary body, both event streams fire (one `pull_request_review_comment` per inline plus one `pull_request_review` for the summary); the question-answering loop deduplicates by treating an empty-body `pull_request_review` as a no-op.

The `pull_request` subscription's `ready_for_review` branch wakes the agent the moment a human publishes a draft. On that event, re-evaluate gates per the **Adaptive Gate Evaluation** rules and advance to Phase 5 or Phase 6 as appropriate — without it, a default-draft PR can sit silently after publish until an unrelated comment or the next scheduled poll wakes the agent. The `closed` branch routes to the termination phase as before.

## Step 3: Launch the status-poll worker

Launch a worker from the `pr-author-status-watcher` expert with the following message. Use your session URL from `session-metadata.md` for `session_url`:

```
repo: {owner}/{repo}
pr_number: {pr_number}
head_sha: {head.sha}
session_url: SESSION_URL
current_state: active
```

The worker manages all CI subscriptions (filtered to the exact head SHA), the 1-hour polling schedule, and resubscribes on each new push. After launching, do NOT loop on `worker-list`.

## Step 4: Post introduction comment

<include src="kb://skills/github/comment-header.md" mode="lazy" />

Using the github tool, post a top-level comment on the PR. Prepend the comment header; the body of the introduction comment is supplied by the expert in the surrounding prose because it varies per expert.

## Step 5: Process existing comments

Fetch all existing comments and reviews on the PR:
- Top-level comments: `GET /repos/{owner}/{repo}/issues/{pr_number}/comments`
- Inline review comments: `GET /repos/{owner}/{repo}/pulls/{pr_number}/comments`
- Review submissions: `GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews` — include only reviews with a non-empty `body`; reviews whose summary body is empty contribute no actionable text of their own (their content is in the inline review comments fetched above).

Process each comment / review using the question-answering rules: filter out your own posts and irrelevant ones, then respond to any that are actionable and have not already been addressed. Items that already have a reply from this agent (identified by the header) can be skipped.

## Step 5b: Evaluate initial gate state

After processing existing comments, check if the PR is already ready to advance — CI may already be green and agent gates may already have completed. Fetch current CI status and evaluate all gates per the **Adaptive Gate Evaluation** rules:

- If Phase 5 conditions are met: advance to **Phase 5** immediately.
- If Phase 6 conditions are met (all merge gates pass): advance to **Phase 6** immediately.
- If a hard gate is blocking (e.g., verification failed, reviewer requested changes), apply the **Notification Policy** with milestone: blocked.
- Otherwise, proceed to Step 6 — the agent will wait for events.

## Step 6: Confirm initialization and link the PR

End the turn with a short, human-friendly message that **always** includes the PR's `html_url`. The link is the most useful piece of information the human reader can get from this message — surface it prominently, do not bury it.

If you arrived at this step via Phase 1 (the agent just opened the PR), use wording such as:

> Opened PR: {html_url} — I'll watch for comments, CI failures, and merge conflicts from here.

If you arrived via direct routing to Phase 2 (the user pointed at an existing PR), use wording such as:

> Now watching {html_url} — I'll respond to comments and try to fix CI failures or merge conflicts as they come up.

Keep it to one or two sentences and skip narration of the steps you just performed.
