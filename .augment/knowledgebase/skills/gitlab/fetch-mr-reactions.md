---
name: gitlab-fetch-mr-reactions
description: Fetch emoji reactions (award emoji) on MR comments using the glab CLI, with reply sentiment classification (agreed / disagreed / discussed). Used by post-hoc analyzers of human signal on an MR.
---
# Fetch reactions and replies

For each comment of interest on an MR, fetch its emoji reactions and any reply thread.

## Emoji reactions (award emoji)

GitLab uses "award emoji" for reactions. List them for an MR note:

```bash
glab api "projects/:fullpath/merge_requests/<mr_iid>/notes/<note_id>/award_emoji"
```

Tally by name. The reactions that carry signal are `thumbsup` and `thumbsdown`; `rocket` / `tada` / `heart` are noise for review-quality purposes. Skip reactions from bot accounts.

## Replies

GitLab MR discussions are threaded — notes within the same discussion share a `discussion_id`. Walk the notes list and collect every note with the same `discussion_id` as the comment you're examining. The first note in the discussion is the parent; subsequent notes are replies.

Skip replies authored by bots — only human replies carry signal.

## Reply sentiment

Classify each human reply by its content into one of three buckets:

- **`agreed`** — the reply confirms the finding. Examples: "good catch", "fixed", "thanks", "you're right", "addressed in {sha}".
- **`disagreed`** — the reply rejects the finding. Examples: "this is intentional", "not a bug", "false positive", "by design".
- **`discussed`** — the reply engages without clear agreement or disagreement. Examples: "what about …", "can you clarify", "have you considered …".

When a thread has multiple replies from the same user, classify on the most recent one — replies escalate or resolve, and the latest is the live signal.
