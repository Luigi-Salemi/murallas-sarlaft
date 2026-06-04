---
name: gitlab-mr-monitor-create-from-task
description: Implement-and-open-MR sequence for an agent that turns a task description into a draft GitLab merge request — implement, branch, commit, push, open as draft, and assign to the creator.
---
# Phase 1: Create the MR

Execute these steps immediately and in order.

## Step 1: Implement the changes

Implement the changes corresponding to the provided task description. Test if possible.

## Step 2: Create a branch, commit, and push

Create a uniquely-named branch, commit the changes, and push to the remote. Branch names must start with the GitLab username from `session-metadata.md` (e.g., `<username>/<short-description>`).

## Step 3: Create a merge request

Using `glab` (or the GitLab MCP server), create a merge request as a **draft** unless the user explicitly requested otherwise. GitLab marks a draft by prefixing the title with `Draft:` (the `glab mr create --draft` flag does this for you). Note the resulting `project` (numeric ID or `group/project` path), MR `iid`, source branch, target branch, and `web_url` — these are needed for the monitoring phase that follows.

When the task references a ticket URL provided by the user, paste it verbatim into the description — do NOT construct or guess URLs.

Additionally, after creating the MR, assign it to the creator. With `glab`:

```
glab mr update <iid> --assignee <gitlab_username> --reviewer <gitlab_username>
```

Or via the API: `PUT /projects/:id/merge_requests/:iid` with the assignee/reviewer user IDs.

Immediately proceed to the monitoring initialization phase.
