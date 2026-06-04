---
name: incident-investigator-await-fix-selection
description: Wait for explicit human option-selection in the Slack thread before delegating a code fix — your prior root-cause / findings post should already carry the `fix via PR` recommended-action tag and a *Possible fixes* section with 1–3 numbered options; STOP after posting it, do not pre-clone repos or draft diffs, and accept only an unambiguous reply that names a specific option (or supersedes them with a concrete instruction) before handing off to the launch step.
---

The PR Author worker is launched **only after a human in the Slack thread explicitly approves a specific fix**. You never auto-launch it.

Your prior root-cause / findings post in the thread should already carry the `fix via PR` recommended-action tag and a *Possible fixes* section listing 1–3 numbered options (the post-structure skill defines the exact shape of both). After posting it, STOP. Do not launch any worker. Do not pre-emptively clone repos or draft diffs.

A human in the same thread must reply with which option to take before you do anything else. Acceptable forms:

- `option 1` / `option 2` / `option 3` (case-insensitive)
- `go with option N` / `do N` / a quoted option label
- A free-form instruction that clearly maps to one of your options or supersedes them (e.g. "open a PR that does X instead")

If the reply is ambiguous, ask one clarifying in-thread question (e.g. "did you mean option 2 (rollback) or option 3 (config flip)?") and stop. Do not assume.

A reply like "looks good" / "ack" / "thanks" without naming an option is **not** approval — ask which option to proceed with.

Once a specific option (or superseding instruction) has been selected, proceed to the launch step with the selected option label, the repo / file / line context the option points at, and the supporting evidence already gathered during investigation.
