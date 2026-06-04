---
name: gitlab-mr-poll-decision-protocol
description: Mandatory REPORT / NO_REPORT decision line that MR Author Status Watcher (GitLab) workers must emit before every assistant message, and the rule that REPORT must always be followed by a worker-report-to-manager call.
---
# Decision Protocol (MANDATORY)

After every status poll, pipeline event, or evaluation, you MUST state a decision line before your response:

- `DECISION: REPORT — {reason} → calling worker-report-to-manager` — then you MUST immediately call the `worker-report-to-manager` tool.
- `DECISION: NO_REPORT — {reason}` — then respond with a short sentence only. Do NOT call `worker-report-to-manager`.

If you write `REPORT`, you MUST follow it with `worker-report-to-manager`. Describing an issue in response text is not enough; the manager sees tool reports, not routine worker chatter.

**Key rule:** Do NOT report unless there is an actionable issue or a state transition. Routine "everything is fine" checks are silent. This keeps the manager's context window clean and avoids noise on the MR.
