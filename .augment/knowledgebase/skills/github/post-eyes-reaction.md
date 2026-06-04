---
name: github-post-eyes-reaction
description: Post a 👀 (`eyes`) reaction on the PR or triggering issue comment as a "currently working" indicator, plus a short top-level "view session" comment linking back to this agent's session. Records session-owned cleanup state so `clear-eyes-reaction` removes only this session's reaction and comment.
---
# Post a 👀 reaction (work started)

Before doing the main review work, post an `eyes` reaction so the PR author can see an agent picked up the request, then post a short top-level comment linking back to this session.

## Choose the target

Inspect the trigger payload (or, for a manual launch, the launching user message) and pick exactly one target:

- **Triggered by an `issue_comment` event** (e.g. a human commented `cosmos review`): react on the triggering comment.
  `POST /repos/{owner}/{repo}/issues/comments/{comment.id}/reactions` with body `{"content": "eyes"}`.
- **Triggered by a `pull_request` event** (`opened` / `ready_for_review`), or launched manually with just a PR URL: react on the PR itself (PRs are issues for the reactions API).
  `POST /repos/{owner}/{repo}/issues/{pull_request.number}/reactions` with body `{"content": "eyes"}`.

## Idempotency

Do not stack duplicate bot reactions. If this session already recorded reaction state, reuse it. Otherwise, check the target reactions first:

- existing bot `eyes`: record `reaction_owned: false` and skip posting
- no bot `eyes`: post `eyes` and record the returned id with `reaction_owned: true`
- raced duplicate response: record `reaction_owned: false` and continue

## Record state for cleanup

Remember this state for cleanup:

- `target_type`: `"comment"` or `"issue"`
- `target_id`: the `comment.id` or `pull_request.number`
- `reaction_id`: the id returned by POST, if this session created one
- `reaction_owned`: `true` only when this session created the reaction; `false` if an existing bot reaction was already present

## Post the session-link comment

After the reaction step, post a short top-level PR comment so the PR author can watch this session in real time. Skip this step entirely (silently) if `session_url` is missing from `session-metadata.md` — do not fall back to a hardcoded URL.

<include src="kb://skills/github/comment-header.md" mode="lazy" />

<include src="kb://skills/github/self-detection.md" mode="lazy" />

Prepend the standard comment header (defined by the included skill above) so self-detection can identify the comment later. The body that follows the header is a single line, with `SESSION_URL` taken from `session-metadata.md`:

```
Started — [view session](SESSION_URL) to follow along.
```

API call: `POST /repos/{owner}/{repo}/issues/{pr_number}/comments` with header + body. Resolve `{pr_number}` from the trigger payload — `issue.number` on an `issue_comment` event, `pull_request.number` on a `pull_request` event.

### Idempotency

If this session already recorded `session_comment_id`, reuse it and skip posting. Otherwise post the comment and record the returned id. A separate session replaying the same brief is a different session with a different `session_url`, so it should post its own link — no cross-comment scan is needed.

### Record state for cleanup

Alongside the reaction state, remember:

- `session_comment_id`: the id of the newly-created comment, if any

## Failure handling

If reaction or session-comment handling fails, log it and continue. This is a UX nicety, not a correctness gate.
