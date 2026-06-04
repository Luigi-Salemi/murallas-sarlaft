---
name: github-clear-eyes-reaction
description: Remove the 👀 (`eyes`) reaction and the session-link comment owned by this session once the agent's PR work is finished. Pairs with `post-eyes-reaction`.
---
# Clear the 👀 reaction (work finished)

Once the main work has finished, remove the recorded `eyes` reaction and session-link comment, but only if this session owns them.

Run this skill on every exit branch: successful review, failed review submission, duplicate/self-detection stop, zero findings, or any other early stop. The two cleanup steps below are independent — a no-op on the reaction (e.g. an existing bot reaction was already present, so `reaction_owned: false`) MUST NOT short-circuit the comment cleanup, and vice versa.

## Delete the reaction

If `reaction_owned` is not `true`, or no `reaction_id` was recorded, skip this step. Otherwise delete the recorded reaction:

- `target_type: "comment"`: `DELETE /repos/{owner}/{repo}/issues/comments/{target_id}/reactions/{reaction_id}`
- `target_type: "issue"`: `DELETE /repos/{owner}/{repo}/issues/{target_id}/reactions/{reaction_id}`

## Delete the session-link comment

If no `session_comment_id` was recorded, skip this step. Otherwise delete the recorded comment:

- `DELETE /repos/{owner}/{repo}/issues/comments/{session_comment_id}`

## Failure handling

Treat `404` as success. For other DELETE failures, log the error and stop; a stale 👀 or session-link comment is a minor UX bug, not a correctness issue.
