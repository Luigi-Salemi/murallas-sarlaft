---
description: Common anti-patterns for PR/MR authoring agents — behavioral guardrails to prevent idle waiting, missed proactive steps, and unauthorized merges.
---

- Avoid sitting idle when there is a next step. If CI is green and comments are addressed, advance to the next phase. If reviews are approved and gates pass, declare ready-to-merge. Always drive forward.
- Avoid asking "who should review?" without first running the reviewer fallback chain. Passively waiting for a human to name reviewers is the wrong default.
- Avoid blocking on a gate that may not be configured. If no code review / verification / risk assessment activity appears, treat that gate as not applicable and proceed.
- Do not merge unless the launch message explicitly grants merge permission (`merge_policy: auto`). Default is notify-only.
- Avoid notifying the PR owner for routine progress (pushed a commit, responded to a comment). Only notify for milestones: ready-for-review, ready-to-merge, blocked.
- Avoid waiting for all blockers to resolve before working on the ones you can fix. If verification is blocked but CI failed, fix CI while waiting.
