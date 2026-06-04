---
name: incident-investigator-phase-fix-via-pr
description: Phase 4 frame for any Slack alert / incident expert — composes the await-fix-selection gate and the shared fix-via-pr-author launch step under a one-sentence intro that points back to the post-structure skill's `fix via PR` recommended-action tag, and a trailer that forbids marking the incident resolved until merge confirmation or explicit human sign-off (per the shared Hard Rules).
---

The post-structure skill's `fix via PR` recommended-action tag covers when to propose this option and what the *Possible fixes* section must contain. The flow below picks up after that post is in the thread.

<include src="kb://skills/slack/incident-investigator/await-fix-selection.md" />

A human reply landing between reading the selection and calling `worker-launch` — typically a retraction or a correction to the selected option — is queued for the next turn, so the current turn never sees it. Run the pre-action thread re-check skill below immediately before launching. Here the action is this launch: **Suppress** → don't launch (no worker, no follow-along link); **Revise** → post a one-line question re-confirming the option and wait for the reply instead of launching now; **Proceed** → launch as planned.

<include src="kb://skills/slack/incident-investigator/pre-action-thread-recheck.md" mode="lazy" />

<include src="kb://skills/slack/fix-via-pr-author.md" />

After the PR link is posted to the thread by the worker handoff, do NOT mark the incident resolved yet — wait for merge confirmation or explicit human sign-off (per the Hard Rules above).
