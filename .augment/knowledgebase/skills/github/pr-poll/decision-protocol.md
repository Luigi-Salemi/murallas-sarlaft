---
name: github-pr-poll-decision-protocol
description: Mandatory REPORT / NO_REPORT decision line that PR Author Status Watcher workers must emit before every assistant message, and the rule that REPORT must always be followed by a `worker-report-to-manager` tool call.
---
# Decision Protocol (MANDATORY)

After every status poll, CI event, or any evaluation, you MUST state a decision line before your response:

- `DECISION: REPORT — {reason} → calling worker-report-to-manager` — then you MUST immediately call the `worker-report-to-manager` tool.
- `DECISION: NO_REPORT — {reason}` — then respond with a short sentence only. Do NOT call `worker-report-to-manager`.

**CRITICAL**: If you write `REPORT`, you MUST follow it with a `worker-report-to-manager` tool call. Describing an issue in your response text is NOT the same as reporting it. The manager cannot see your response text — it can ONLY see `worker-report-to-manager` tool calls. If you identify an actionable issue but do not call the tool, the manager will never know.

**Key rule:** Do NOT report to manager unless there is an actionable issue or a state transition. Routine "everything is fine" checks are silent. This keeps the manager's context window clean.
