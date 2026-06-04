---
name: gitlab-mr-monitor-comment-answering
description: Question-answering loop for an MR-monitoring agent. Filters incoming GitLab note events, classifies them, and responds (answer, implement-and-push, or acknowledge).
---
# MR Comment Answering

When a GitLab note event or existing unhandled note is processed, proceed through the steps below.

GitLab note events use `object_kind: note` with `object_attributes.noteable_type: MergeRequest`. Inline diff notes have a non-null `object_attributes.position`; all notes are threaded by `discussion_id`.

## Step 1: Reactivate if needed

<include src="kb://skills/gitlab/mr-activity-states.md" mode="lazy" />

If the agent is currently in **Idle** or **Dormant** state, a new note means the MR is active again. Send a message to the status-poll worker: `reactivate: MR has new activity, transition to active state`. If already **Active**, skip this step.

## Step 2: Filter

<include src="kb://skills/gitlab/self-detection.md" mode="lazy" />

Ignore notes and approval events that should not receive a reply:
- Notes authored by this agent (match the link target in the comment header against your session URL).
- System notes (`object_attributes.system: true` or `system: true`).
- Pure status notifications from pipeline, deploy, or coverage bots, unless they contain actual code review feedback.
- Notes clearly directed at another person and not the on-behalf-of user named in your context.
- Approval/unapproval events with no note body.

If the event should be ignored, skip to Step 4.

## Step 3: Respond to the note

<include src="kb://skills/gitlab/comment-header.md" mode="lazy" />

Determine the type of note and respond accordingly. Remember to prepend the comment header to every note you post.

- **Question about the MR**: Answer the question by posting a reply note in the same discussion thread.
- **Change request or code suggestion**: Implement the requested changes, commit, and push to the MR's source branch. Then reply on the note confirming what you changed. If you decide not to implement a suggestion, you MUST still reply explaining why. Never silently ignore a suggestion.
- **General feedback or approval**: Reply with a brief acknowledgment if appropriate.

Reply where the source content lives:
- **Top-level discussion note** (`position` is null) → reply to the same discussion via `POST /projects/:id/merge_requests/:iid/discussions/:discussion_id/notes`.
- **Inline diff note** (`position` is non-null) → reply on the same discussion thread. The thread already carries the `position`; do not re-attach it.
- **No `discussion_id` available** → use `glab mr note {iid} --repo {project} --message …` for a fresh top-level note.

```
glab api --method POST "projects/:url-encoded-project/merge_requests/{iid}/discussions/{discussion_id}/notes" -f body="<header>

<response>"
```

## Step 4: Wrap up the turn

End with a short, human-friendly sentence that says what you did and why. One sentence is plenty; skip narration of the steps you took to get there.
