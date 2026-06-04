---
name: slack-fix-via-pr-author
description: Launch a PR Author worker for a fix that has already been selected by a human in the Slack thread, then post a one-line follow-along link to the worker session in that same thread. The composing expert is responsible for obtaining the explicit human selection beforehand; this skill owns the worker launch + follow-along handoff only.
---

The PR Author worker is launched **only after a human in the Slack thread has explicitly approved a specific fix**. You never auto-launch it. Obtaining and validating that approval is the composing expert's responsibility — by the time this skill runs, you must already have a selected option label (or a superseding free-form instruction), the repo and file(s) the fix points at, and the supporting evidence the fix rests on.

## Launch the PR Author worker

Launch the PR Author worker. Pass in the worker message:

- Which option the human picked (verbatim, plus your option label) or the superseding instruction if they gave one instead of picking from your options.
- The repo and file(s) to change, with line numbers if known.
- The supporting evidence the fix rests on (log excerpts, diff link, metric snapshot, ticket link — whatever the composing expert gathered).
- Whether to open as draft or ready (the composing expert decides this from its confidence in the fix).
- A link back to this session for context.
- A `lifecycle` + `milestone_updates: required` instruction telling the worker how to report progress. Each pause point: one `worker-report-to-manager` call with a human-readable mrkdwn `summary` that includes the PR/MR `html_url`; `terminate: true` only on the terminal report. The composing expert relays a `summary` into the originating thread only on three user-facing milestones — **PR Opened**, **PR Ready to Merge**, **PR Merged** — or on any terminal report (so the thread always gets a final signal, including aborts and closed-without-merge); every other intermediate report (CI-failure recovery, blocked-on-review, stale-review nudges) is processed internally. Pack user-facing context into the relayed summaries, and make the terminal `summary` user-facing on every path (state the outcome plainly when the PR is not merged). The worker has no Slack capability and must not post directly. First report lands at end of Phase 1; the worker then continues into Phase 2 and reports later pause points. Do NOT self-terminate before the terminal report.

Immediately after `worker-launch` returns, post one short in-thread message linking to the new PR Author session so the humans in the thread can follow along while the worker runs:

```
:wrench: PR Author launched — <{WORKER_SESSION_URL}|follow along>
```

Compose `{WORKER_SESSION_URL}` by taking the host from your own `{SESSION_URL}` and substituting the `agentId` query param with the worker id returned by `worker-launch` (e.g. `https://app.<host>/app/session?agentId=<WORKER_AGENT_ID>`). Post this once, immediately after launch.

After launching, STOP and wait. Reports arrive as `<worker>` messages over the lifetime of the PR/MR; the composing expert applies the relay contract above and clears scratch state on the terminal report. This skill only owns the proposal → approval → launch → follow-along-link handoff.
