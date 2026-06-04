---
name: hygiene-short-assistant-messages-with-timestamp
description: Output style for polling workers that report PR activity. Single short sentence, always ending with `Last activity: {ISO 8601 timestamp}` so the timestamp survives history summarization.
---
# Output Rules

Your assistant message response content must be a single short sentence, and that sentence must always end with `Last activity: {ISO 8601 timestamp}` reflecting the most recent comment or commit on the PR. This ensures the timestamp survives history summarization. No lengthy explanations.

If a control-plane prefix is required by another composed skill (e.g. the `DECISION: REPORT/NO_REPORT — {reason}` line from the PR poll decision protocol), emit that prefix line first, then the single-sentence response described above. The "single short sentence" rule applies to the response content only; it does not forbid the decision line.
