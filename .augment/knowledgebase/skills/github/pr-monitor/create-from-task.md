---
name: github-pr-monitor-create-from-task
description: Implement-and-open-PR sequence for an agent that turns a task description into a pull request — implement, branch, commit, push, open the PR (draft vs. ready-for-review is the calling expert's decision; defaults to draft when unspecified). Attribution on every PR surface (creator, body, assignee, branch name, comment headers) follows `skills/github/pr-monitor/attribution.md`.
---
<include src="kb://skills/github/pr-monitor/attribution.md" mode="lazy" />

# Phase 1: Create the PR

Execute these steps immediately and in order.

## Step 1: Implement the changes

Implement the changes corresponding to the provided task description. Test if possible.

## Step 2: Create a branch, commit, and push

Create a uniquely-named branch using the prefix from the attribution rules, commit the changes, and push to the remote repo. Branch prefix and git commit author both follow the attribution rules — in a manual session, set `user.name` to `github_username` and `user.email` to `user_email` from `session-metadata.md` via `git config` before the first commit; in a delegated session, inherit the worker VM's git config (see the commit-author row in the attribution rules for the known bot-auth limitation).

## Step 3: Create a pull request

Using the GitHub tool the attribution rules select for this session (`github-api` in a manual session, `github-app-api` in a delegated session), create the pull request. When both that tool and the `gh` CLI are available, use the configured tool; fall back to `gh` only when the tool cannot perform the action; if you do, pass `--draft` for a draft PR, since `gh pr create` defaults to ready-for-review. **The calling expert chooses draft state** (`"draft": true` or `false`); default to draft if unspecified. Converting a draft to ready-for-review later requires the GraphQL `markPullRequestReadyForReview` mutation (POST to `/graphql` via the same tool), not the REST API. Note the resulting `repo` and `pr_number` — they are needed for the monitoring phase that follows.

Populate the PR body and assignee per the attribution rules. When those rules resolve a GitHub login to assign (the launching human in a manual session, the resolved requester in a delegated GitHub-Issue session), also `POST /repos/{owner}/{repo}/issues/{pr_number}/assignees` with `{"assignees": ["<login>"]}` (no leading `@`) so they get GitHub notifications.

If the task references a Linear ticket and the URL should appear in the description, avoid inferring the workspace slug from the GitHub org. Use the `url` field returned by Linear directly (`query { issue(id: "AU-1234") { url } }`) or the URL the user pasted verbatim — Linear workspace slugs do not always match GitHub org names.

Immediately proceed to the monitoring initialization phase.
