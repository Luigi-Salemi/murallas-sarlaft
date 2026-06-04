---
name: gitlab-mr-poll-status-poll
description: Periodic status-poll cycle for the MR Author Status Watcher (GitLab) worker — fetch MR state, check pipeline fallback, check merge conflicts, evaluate activity-state transitions, and handle reactivation/termination messages.
---
# Status Poll

Execute these steps on every scheduled tick and once on startup.

## Step 1: Fetch MR state

```
glab mr view {iid} --repo {project} --output json
```

Note `state`, `detailed_merge_status`, `merge_status`, `has_conflicts`, `diff_refs.head_sha`, `source_branch`, `target_branch`, `draft`, `work_in_progress`, `web_url`, and `updated_at`.

If `state` indicates the MR is closed or merged, follow the termination flow.

If the fetched head SHA differs from your tracked SHA, update your tracked SHA and rotate pipeline subscriptions: always unsubscribe the existing SHA-scoped pipeline subscription first, then subscribe for the new SHA. This handles missed push webhooks.

## Step 2: Check merge state

Use `detailed_merge_status` as authoritative when present; fall back to `merge_status` and `has_conflicts`.

- **`mergeable`** (or legacy `merge_status: "can_be_merged"` with `has_conflicts: false`) → no action needed; proceed to Step 3.
- **`need_rebase`** or branch-behind evidence → `DECISION: REPORT`; call `worker-report-to-manager` with `status: "action_needed"` and summary "MR !{iid} is behind the target branch and needs rebase".
- **`checking`** or **`unchecked`** → wait 10 seconds and retry Step 1 up to 3 times. If still indeterminate, proceed to Step 3.
- **`conflict`**, `has_conflicts: true`, or legacy `merge_status: "cannot_be_merged"` → `DECISION: REPORT`; call `worker-report-to-manager` with `status: "action_needed"` and summary "Merge conflict detected on MR !{iid}".
- **`ci_must_pass`**, **`discussions_not_resolved`**, **`draft_status`**, **`not_approved`** → proceed to Step 3. Pipeline failures are caught by webhook handling or Step 3; the other states require human action.

## Step 3: Check pipeline status fallback

This catches pipeline failures missed because of webhook races or disabled custom-webhook subscriptions:

```
glab api "projects/:url-encoded-project/pipelines?sha={head_sha}"
glab api "projects/:url-encoded-project/pipelines/{pipeline_id}/jobs"
```

If the latest pipeline is `failed` or `canceled`, collect jobs with `status` in (`failed`, `canceled`) and `allow_failure` not `true`.

If actionable failures exist → `DECISION: REPORT`; call `worker-report-to-manager` with:

```
summary: "Pipeline failure on MR !{iid} (detected on status poll): {list of failing job names}"
status: "ci_failure"
terminate: false
```

If no actionable failures exist, continue silently.

<include src="kb://skills/gitlab/mr-poll/ci-pipeline-polling.md" mode="lazy" />

## Step 4: Check activity and manage polling state

<include src="kb://skills/gitlab/mr-activity-states.md" mode="lazy" />

Determine the time since the last activity on the MR. Activity is the most recent of:
- The timestamp of the latest non-system note on the MR, excluding notes identified by the manager's session URL in their header.
- The timestamp of the latest commit on the source branch.

Fetch notes:

```
glab api "projects/:url-encoded-project/merge_requests/{iid}/notes?per_page=100"
```

Based on the time since last activity, evaluate state transitions:

**If inactive for 168+ hours (and currently active or idle) → transition to dormant:**
1. Unsubscribe from all subscriptions (scheduled poll, pipeline webhook, and MR update webhook).
2. `DECISION: REPORT`; call `worker-report-to-manager` with:
   ```
   summary: "MR inactive for 168+ hours, transitioning to dormant"
   status: "state_change"
   terminate: false
   ```

**If inactive for 12+ hours (and currently active) → transition to idle:**
1. Unsubscribe from the current 1-hour scheduled poll.
2. Subscribe to a 3-hour scheduled poll: `0 */3 * * *`.
3. `DECISION: REPORT`; call `worker-report-to-manager` with:
   ```
   summary: "MR inactive for 12+ hours, transitioning to idle"
   status: "state_change"
   terminate: false
   ```

**Otherwise → remain in current state:** `DECISION: NO_REPORT`. Respond with a short sentence and stop.

## Reactivation

If you receive a manager message saying the MR has been reactivated:

1. Unsubscribe from existing scheduled, pipeline, and MR update subscriptions to avoid duplicates.
2. Subscribe to the 1-hour scheduled poll: `0 * * * *`.
3. Fetch the current head SHA and resubscribe to pipeline and MR update events.
4. Update internal state to `active`.
5. Run an immediate status poll.

## Termination

If you receive a manager message saying the MR is closed or merged:

1. Unsubscribe from all subscriptions (scheduled, pipeline, and MR update).
2. Call `worker-report-to-manager` with `terminate: true` and stop.

## Key rule

Do not report to the manager unless there is an actionable issue or a state transition. Routine healthy checks are silent.
