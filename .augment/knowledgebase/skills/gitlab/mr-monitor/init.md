---
name: gitlab-mr-monitor-init
description: Initialization steps for an MR-monitoring agent. Fetches head SHA, subscribes to GitLab webhook events for notes and MR closure, launches the status-poll worker, posts the introduction note, and processes existing notes.
---
# MR Monitor Initialization

Execute these steps immediately and in order. Throughout, `{project}` is the project's numeric ID or `group/project` path, and `{iid}` is the MR's project-local ID.

GitLab webhook events arrive through a custom webhook created with `auggie cloud webhook create --type gitlab`. Runtime subscriptions use `source: "CUSTOM"` and filter on GitLab payload fields such as `object_kind`, `project.path_with_namespace`, and `object_attributes.iid`. There is no runtime `webhook_id` filter.

## Step 1: Fetch MR details

Fetch MR details:

```
glab mr view {iid} --repo {project} --output json
```

Note `web_url`, `source_branch`, `target_branch`, and the current head SHA. Prefer `diff_refs.head_sha`; if missing, use the latest commit SHA returned by `glab`.

## Step 2: Register manager subscriptions

Subscribe to GitLab note and MR-close events. Pipeline subscriptions are owned by the status-poll worker.

```json
{
  "subscriptions": [
    {
      "source": "CUSTOM",
      "filter_payload": {"and": [
        {"==": [{"var": "object_kind"}, "merge_request"]},
        {"==": [{"var": "project.path_with_namespace"}, "{project}"]},
        {"==": [{"var": "object_attributes.iid"}, {iid}]},
        {"in": [{"var": "object_attributes.action"}, ["close", "merge"]]}
      ]},
      "description": "Watch for when the MR is closed or merged"
    },
    {
      "source": "CUSTOM",
      "filter_payload": {"and": [
        {"==": [{"var": "object_kind"}, "note"]},
        {"==": [{"var": "project.path_with_namespace"}, "{project}"]},
        {"==": [{"var": "merge_request.iid"}, {iid}]},
        {"==": [{"var": "object_attributes.noteable_type"}, "MergeRequest"]},
        {"!=": [{"var": "object_attributes.system"}, true]}
      ]},
      "description": "Watch top-level discussion notes and inline diff notes on the MR"
    }
  ]
}
```

If `subscribe-event` rejects `CUSTOM`, continue in poll-only mode: skip manager webhook subscriptions and rely on the status-poll worker's scheduled polling. Post one MR note (with the comment header) saying live events are unavailable and hourly polling will be used.

## Step 3: Launch the status-poll worker

Launch a worker from the `MR Author Status Watcher (GitLab)` expert with:

```
project: {project}
iid: {iid}
head_sha: {head_sha}
session_url: SESSION_URL
current_state: active
```

Replace `SESSION_URL` with the actual session URL from `session-metadata.md`.

The worker manages the scheduled poll, pipeline subscriptions, and push-event subscription. After launching, do not loop on `worker-list`.

## Step 4: Post introduction note

<include src="kb://skills/gitlab/comment-header.md" mode="lazy" />

Post a top-level note on the MR. Prepend the comment header; the body of the introduction note is supplied by the expert in the surrounding prose because it varies per expert.

```
glab mr note {iid} --repo {project} --message "<header>

<introduction body>"
```

## Step 5: Process existing notes

Fetch top-level notes and discussion threads:

```
glab api "projects/:url-encoded-project/merge_requests/{iid}/notes?per_page=100"
glab api "projects/:url-encoded-project/merge_requests/{iid}/discussions?per_page=100"
```

Filter out `system: true` notes, then apply the question-answering rules. Skip items that already have a reply from this agent, identified by the session link in the header.

## Step 6: Confirm initialization and link the MR

End the turn with a short, human-friendly message that **always** includes the MR's `web_url`. The link is the most useful piece of information the human reader can get from this message — surface it prominently, do not bury it.

If you arrived at this step via Phase 1 (the agent just opened the MR), use wording such as:

> Opened MR: {web_url} — I'll watch for notes, pipeline failures, and merge conflicts from here.

If you arrived via direct routing to Phase 2 (the user pointed at an existing MR), use wording such as:

> Now watching {web_url} — I'll respond to notes and try to fix pipeline failures or merge conflicts as they come up.

Keep it to one or two sentences and skip narration of the steps you just performed.
