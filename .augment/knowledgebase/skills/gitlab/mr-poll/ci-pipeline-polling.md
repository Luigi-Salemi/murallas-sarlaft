---
name: gitlab-mr-poll-ci-pipeline-polling
description: Pipeline status checking for GitLab MRs via the glab CLI. Handles SHA-scoped custom-webhook pipeline events and scheduled-poll fallback.
---
# CI Pipeline Polling

Pipeline status is checked from SHA-scoped `pipeline` custom-webhook events and during scheduled status-poll fallback. Never use a webhook payload's pipeline summary as sufficient detail for failures; fetch jobs from the API.

## Subscribe to pipeline events for a SHA

When subscribing on startup or after a new push, create a `CUSTOM` subscription filtered to the current head SHA:

```json
{
  "source": "CUSTOM",
  "filter_payload": {"and": [
    {"==": [{"var": "object_kind"}, "pipeline"]},
    {"==": [{"var": "project.path_with_namespace"}, "{project}"]},
    {"==": [{"var": "object_attributes.sha"}, "{head_sha}"]},
    {"in": [{"var": "object_attributes.status"}, ["failed", "success", "canceled", "skipped"]]}
  ]},
  "description": "Pipeline status changes for {head_sha}"
}
```

If custom-webhook subscriptions are unavailable, skip this subscription and rely on scheduled polling.

## On a terminal pipeline event

The SHA filter guarantees the event is for the current head commit.

- `success` or `skipped` → `DECISION: NO_REPORT`.
- `failed` or `canceled` → fetch full pipeline details and jobs:
  ```
  glab api "projects/:url-encoded-project/pipelines?sha={head_sha}"
  glab api "projects/:url-encoded-project/pipelines/{pipeline_id}/jobs"
  ```

Collect jobs with `status` in (`failed`, `canceled`) and `allow_failure` not `true`.

## Getting failure details

For each failed job, fetch its log:

```
glab ci trace <job_id>
```

The trace output contains the full job log. Parse the relevant failure
lines to diagnose the issue.

## Reporting

If actionable failures exist, `DECISION: REPORT` and call `worker-report-to-manager` with:

```
summary: "Pipeline failure on MR !{iid}: {list of failing job names}"
status: "ci_failure"
terminate: false
```

If no actionable failures are found, `DECISION: NO_REPORT`. Do not report routine "everything is fine" checks.

## Pipeline retries

If a failure appears to be transient (network timeout, flaky test),
retry the job:

```
glab ci retry <job_id>
```

Only retry once per job per poll cycle. If the same job fails again
on the next poll, treat it as a persistent failure and attempt a fix.
