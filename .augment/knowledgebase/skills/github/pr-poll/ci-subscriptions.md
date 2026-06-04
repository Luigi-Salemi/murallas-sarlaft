---
name: github-pr-poll-ci-subscriptions
description: SHA-scoped CI subscription management for the PR Author Status Watcher worker — initial subscribe, rotation on new pushes, and the webhook-triggered fetch-and-report rule (never trust the webhook payload's conclusion field).
---
# CI Subscription Management

You own all CI-related subscriptions. The PR-monitoring manager does NOT subscribe to any CI events.

## Subscribing to CI for a SHA

When subscribing (on startup or after a new push), create these three subscriptions. Replace `{owner}/{repo}`, `{head_sha}`, and `{pr_number}` with the values from the manager message.

```json
{
  "subscriptions": [
    {
      "source": "GITHUB",
      "event_type": "check_suite",
      "filter_payload": {"and": [{"==": [{"var": "repository.url"}, "https://api.github.com/repos/{owner}/{repo}"]}, {"==": [{"var": "action"}, "completed"]}, {"==": [{"var": "check_suite.head_sha"}, "{head_sha}"]}]},
      "description": "CI check suite completed for {head_sha}"
    },
    {
      "source": "GITHUB",
      "event_type": "status",
      "filter_payload": {"and": [{"==": [{"var": "repository.url"}, "https://api.github.com/repos/{owner}/{repo}"]}, {"in": [{"var": "state"}, ["failure", "error"]]}, {"==": [{"var": "sha"}, "{head_sha}"]}]},
      "description": "Commit status failure for {head_sha}"
    },
    {
      "source": "GITHUB",
      "event_type": "pull_request",
      "filter_payload": {"and": [{"==": [{"var": "repository.url"}, "https://api.github.com/repos/{owner}/{repo}"]}, {"==": [{"var": "pull_request.number"}, {pr_number}]}, {"==": [{"var": "action"}, "synchronize"]}]},
      "description": "Watch for new pushes to PR branch"
    }
  ]
}
```

## On `pull_request` synchronize event (new push)

When you receive a `pull_request` synchronize event:

1. Extract the new head SHA from `pull_request.head.sha` in the event payload.
2. Unsubscribe from the old `check_suite` and `status` subscriptions (the ones filtered to the previous SHA). Use `list-subscriptions` to find them by their description containing the old SHA.
3. Subscribe to new `check_suite` and `status` events filtered to the new SHA (same JSON shape as above, with updated `{head_sha}`).
4. Update your tracked head SHA to the new value.
5. Do NOT unsubscribe from the `pull_request` synchronize subscription — it is SHA-independent.
6. Respond with a short sentence and stop.

## On `check_suite` completion or `status` event

**⚠️ NEVER use the `conclusion` or `state` field from the webhook payload itself to determine CI status. The webhook is only a trigger — you MUST call the API to get the actual results. A `check_suite` with `conclusion: success` does NOT mean all individual checks passed.**

1. **Ignore the webhook payload's conclusion/state fields entirely.** The SHA filter guarantees this is for the current head commit — no need to re-verify the SHA, but you MUST fetch fresh results from the API.
2. Fetch full CI details for the head SHA. Call BOTH endpoints:
   - `GET /repos/{owner}/{repo}/commits/{head_sha}/check-runs`
   - `GET /repos/{owner}/{repo}/commits/{head_sha}/status`
3. Collect all failures: checks with `conclusion` in (`failure`, `cancelled`, `timed_out`), statuses with `state` in (`failure`, `error`).
4. If failures exist → `DECISION: REPORT` — call `worker-report-to-manager` with:
   ```
   summary: "CI failure on PR #{pr_number}: {list of failing check names/contexts}"
   status: "ci_failure"
   terminate: false
   ```
5. If no failures are found → `DECISION: NO_REPORT`. Respond with a short sentence and stop.
