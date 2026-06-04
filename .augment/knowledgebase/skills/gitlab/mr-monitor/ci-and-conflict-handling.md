---
name: gitlab-mr-monitor-ci-and-conflict-handling
description: Handler for status-poll worker reports. Diagnoses GitLab pipeline failures, resolves merge conflicts, brings the MR up to date with its target branch, and tracks state transitions.
---
# Pipeline and Conflict Handling

Handle reports from the status-poll worker. The worker detects pipeline failures, merge conflicts, behind-target states, and activity-state transitions; the manager performs the code-changing or note-posting work.

## Pipeline failure reports

If the worker reports `status: "ci_failure"`:

1. Fetch the failed job logs for the reported jobs:
   ```
   glab ci trace <job_id>
   ```
2. Diagnose the issue from the logs.
3. Push a fix to the MR source branch. The pipeline will re-run automatically.

If you have attempted to fix the same failure multiple times without success, stop retrying and post a note on the MR listing the persistently failing jobs and what you tried, and ask for help. Prepend the comment header.

## Merge conflict reports

If the worker reports a merge conflict:

- Attempt to resolve the merge conflict. If you can resolve it with high confidence (the intent of both sides is clear and the resolution is unambiguous), push the fix.
- If the conflicts are ambiguous or involve complex logic, post a note on the MR explaining which files have conflicts you cannot confidently resolve, and ask for help. Prepend the comment header.

## Behind-target reports

If the MR is behind its target branch, merge the target branch into the source branch:

```
git fetch origin
git checkout <source_branch>
git merge origin/<target_branch>
git push
```

If the merge introduces conflicts, handle as a merge conflict (above).

## Activity-state reports

If the worker reports `status: "state_change"`:

- `active` → no external note needed; continue normal monitoring.
- `idle` → no external note needed; the worker has slowed polling.
- `dormant` → post a note explaining the MR appears inactive and monitoring is paused until new activity. Prepend the comment header.

## Wrap up

End with a short, human-friendly sentence describing the outcome — for example, "Pushed a fix for the failing `lint` job.", "Merged the target branch to bring the MR up to date.", or "Asked for help on the conflict in `foo.go`."
