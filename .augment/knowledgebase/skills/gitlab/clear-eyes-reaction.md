---
name: gitlab-clear-eyes-reaction
description: Remove the 👀 (`eyes`) emoji reaction owned by this session once the agent's MR work is finished. Pairs with `post-eyes-reaction`.
---
# Clear the 👀 reaction (work finished)

Once the main work has finished, remove the `eyes` reaction recorded by the paired post-eyes-reaction skill only if this session owns it.

## Endpoint

If `reaction_owned` is not `true`, or no `reaction_id` was recorded, skip. Otherwise delete the recorded reaction:

```bash
glab api --method DELETE "projects/:url-encoded-project/merge_requests/{iid}/award_emoji/{reaction_id}"
```

Run this skill on every exit branch: successful review, failed review submission, duplicate/self-detection stop, zero findings, or any other early stop.

## Failure handling

Treat `404` as success. For other DELETE failures, log the error and stop; a stale 👀 is a minor UX bug, not a correctness issue.
