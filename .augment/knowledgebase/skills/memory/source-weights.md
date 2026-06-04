---
name: memory-source-weights
description: Source-weighting table for breadcrumb sections — `human-feedback` ×3, `human-comment` ×2, `agent-inferred` ×1, `human-reaction` ×1, `pr-outcome` ×1. Used by writers (to pick a `Source:` value) and curators (to compute a section's evidence score). Single source of truth for both sides.
---
# Source weighting

Every breadcrumb section declares one `Source:` value (or, after compaction, a multi-source list). The five allowed values and their weights:

| Source           | Weight | Description                                                                                      |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `human-feedback` | 3      | Human engineer explicitly approved or provided the insight in-session.                            |
| `human-comment`  | 2      | Noise-filtered human PR comment (1+ reactions, substantive reply, or addressed change request). |
| `agent-inferred` | 1      | Agent auto-captured the insight; human was notified but did not explicitly confirm or deny.       |
| `human-reaction` | 1      | Any indication an agent comment was addressed (👍, reply saying addressed, or change made) with no further textual context. |
| `pr-outcome`     | 1      | Pattern inferred from a merge or close outcome with no explicit human signal.                    |

**Picking a source as a writer.** Use the strongest signal present:
- `human-feedback` only when the human explicitly approved an insight in the current session — never inferred. This includes cases where the human endorses an `agent-inferred` insight after seeing the heads-up.
- `human-comment` when noise-filtered human PR comments are part of the signal.
- `agent-inferred` when the agent auto-captures an insight during or after a task and the human has not yet responded.
- `human-reaction` when the only human signal is that an agent comment was addressed (👍, reply saying addressed, or the suggested change actually being made) without substantive textual insight.
- `pr-outcome` when no human signal exists at all; the pattern was inferred from the merge/close outcome itself.

**Upgrade path.** When a breadcrumb was initially written as `agent-inferred` and the human later explicitly endorses it (e.g. "yes, good", "that's right", 👍 in response to the heads-up), the writer upgrades `Source:` to `human-feedback` in-place. This immediately raises the section's evidence score from 1 to 3, which is enough to promote the insight to visible curated knowledge on the next curation pass.

**Computing an evidence score as a curator.** A section that is merged in breadcrumb compaction carries a multi-source header like `- **Source:** human-feedback ×2, agent-inferred ×3`. The section's evidence score is the sum over every listed source of (weight × count). A bullet is promoted to visible curated knowledge when the sum across all supporting sections reaches **3 or more**.
