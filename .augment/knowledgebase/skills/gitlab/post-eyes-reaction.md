---
name: gitlab-post-eyes-reaction
description: Post a 👀 (`eyes`) emoji reaction on the MR as a "currently working" indicator, recording enough state for `clear-eyes-reaction` to remove only this session's reaction.
---
# Post a 👀 reaction (work started)

Before doing the main review work, post an `eyes` emoji reaction so the MR author can see an agent picked up the request.

## Post the reaction

Use the `glab` CLI to add an award emoji to the MR:

```bash
glab api --method POST "projects/:fullpath/merge_requests/<mr_iid>/award_emoji" -f name=eyes
```

Parse the returned `id` from the JSON response.

## Idempotency

Do not stack duplicate bot reactions. If this session already recorded reaction state, reuse it. Otherwise, check existing award emoji first:

```bash
glab api "projects/:fullpath/merge_requests/<mr_iid>/award_emoji"
```

- existing bot `eyes`: record `reaction_owned: false` and skip posting
- no bot `eyes`: post `eyes` and record the returned id with `reaction_owned: true`

## Record state for cleanup

Remember this state for cleanup:

- `mr_iid`: the MR internal ID
- `reaction_id`: the id returned by POST, if this session created one
- `reaction_owned`: `true` only when this session created the reaction

## Failure handling

If reaction handling fails, log it and continue. This is a UX nicety, not a correctness gate.
