---
name: github-pr-poll-status-poll
description: Periodic status-poll cycle for the PR Author Status Watcher worker — fetch PR state, check merge state, fall back to a CI status fetch, evaluate activity-state transitions (active → idle → dormant), and handle reactivation/termination messages from the manager.
---
# Startup

When you receive the initial `<manager>` message:

1. Parse the repo, PR number, head SHA, manager session URL, and current activity state from the message.
2. Subscribe to the appropriate scheduled status poll based on `current_state`:
   - `active` → `0 * * * *` (every 1 hour)
   - `idle` → `0 */3 * * *` (every 3 hours)
   - `dormant` → do not subscribe (no polling)
3. Subscribe to CI events and push events for the current head SHA.

<include src="kb://skills/github/pr-poll/ci-subscriptions.md" mode="lazy" />
4. Run one immediate status poll (proceed to Status Poll below).

# Status Poll

Execute these steps on every scheduled tick and on startup.

## Step 1: Fetch PR state

`GET /repos/{owner}/{repo}/pulls/{pr_number}` (with details). Note `mergeable_state`, `mergeable`, `head.sha`, `draft`, and `updated_at`.

If the fetched `head.sha` differs from your tracked value, update your tracked SHA and rotate CI subscriptions: always unsubscribe all existing CI subscriptions first, then subscribe for the new SHA. This handles races (e.g., a push between startup steps 3 and 4) and missed synchronize webhooks.

## Step 2: Check merge state

Based on `mergeable_state`:

- **`clean`** → No action needed. Proceed to Step 3.
- **`behind`** → `DECISION: REPORT` — call `worker-report-to-manager` with:
  ```
  summary: "PR #{pr_number} is behind the base branch"
  status: "action_needed"
  terminate: false
  ```
  Proceed to Step 3.
- **`unknown`** → Wait 10 seconds and retry Step 1 (up to 3 times). If still unknown, proceed to Step 3.
- **`dirty`** or **`mergeable` is `false`** → `DECISION: REPORT` — call `worker-report-to-manager` with:
  ```
  summary: "Merge conflict detected on PR #{pr_number}"
  status: "action_needed"
  terminate: false
  ```
  Proceed to Step 3.
- **`unstable`** or **`blocked`** → Proceed to Step 2b (run the CI fallback, then Step 3).

## Step 2b: Check CI status (fallback)

Reached only from the `unstable` / `blocked` branch of Step 2. All other merge-state branches skip directly to Step 3 because they either don't imply CI activity (`clean`), have already reported a non-CI issue (`behind`, `dirty`), or could not determine state (`unknown`). After this step, always proceed to Step 3.

This catches CI failures that may have been missed due to webhook races or delivery issues. Fetch both CI endpoints:
1. `GET /repos/{owner}/{repo}/commits/{head_sha}/check-runs`
2. `GET /repos/{owner}/{repo}/commits/{head_sha}/status`

If there are failures (checks with `conclusion` in (`failure`, `cancelled`, `timed_out`), statuses with `state` in (`failure`, `error`)) → `DECISION: REPORT` — call `worker-report-to-manager` with:
```
summary: "CI failure on PR #{pr_number} (detected on status poll): {list of failing check names/contexts}"
status: "ci_failure"
terminate: false
```
Then proceed to Step 3.

If no failures → proceed silently to Step 3.

## Step 3: Check activity and manage polling state

Determine the time since the last activity on the PR. Activity is defined as the most recent of:
- The timestamp of the latest **top-level (issue) comment** on the PR
- The timestamp of the latest **inline review comment** on the PR
- The timestamp of the latest **review submission** (approval, request-changes, or plain comment review) on the PR
- The timestamp of the latest commit on the PR branch

In all three comment/review fetches, exclude entries whose body header matches the manager's session URL — those are the manager's own posts and don't count as activity.

Fetch all three comment/review streams and take the max `created_at` (or `submitted_at` for reviews) across them:
1. `GET /repos/{owner}/{repo}/issues/{pr_number}/comments` — top-level comments
2. `GET /repos/{owner}/{repo}/pulls/{pr_number}/comments` — inline review comments
3. `GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews` — review submissions

Combine with the latest commit timestamp from Step 1's PR payload (`head.commit.author.date` if available, otherwise the PR's `updated_at`).

Based on the time since last activity, evaluate state transitions:

**If inactive for 168+ hours (and currently active or idle) → transition to dormant:**
1. Unsubscribe from all subscriptions (scheduled status poll, CI webhooks, and synchronize).
2. `DECISION: REPORT` — call `worker-report-to-manager` with:
   ```
   summary: "PR inactive for 168+ hours, transitioning to dormant"
   status: "state_change"
   terminate: false
   ```

**If inactive for 12+ hours (and currently active) → transition to idle:**
1. Unsubscribe from the current 1-hour scheduled status poll.
2. Subscribe to a 3-hour scheduled status poll: `0 */3 * * *`
3. `DECISION: REPORT` — call `worker-report-to-manager` with:
   ```
   summary: "PR inactive for 12+ hours, transitioning to idle"
   status: "state_change"
   terminate: false
   ```

**Otherwise → remain in current state:**
`DECISION: NO_REPORT`. Respond with a short sentence and stop.

# Reactivation

If you receive a `<manager>` message saying the PR has been reactivated (e.g., new comment received):
1. Unsubscribe from any existing subscriptions (scheduled, CI, synchronize) to avoid duplicates.
2. Subscribe to the 1-hour status poll: `0 * * * *`
3. Fetch the current head SHA from the PR and subscribe to CI events and synchronize.
4. Update your internal state to `active`.
5. Run an immediate status poll.

# Termination

If you receive a `<manager>` message saying the PR is closed/merged:
1. Unsubscribe from all subscriptions (scheduled, CI, and synchronize).
2. Call `worker-report-to-manager` with `terminate: true` and stop.
