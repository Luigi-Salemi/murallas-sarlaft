---
name: incident-investigator-stop-conditions
description: Shared per-incident anti-rabbit-hole stop conditions for any Slack alert / incident expert — when to bail out and report `inconclusive`, plus the requirement that every such report name what context or access would have closed the gap.
---

Stop the current investigation and report `inconclusive` if any of:

- 15 tool calls with no `High` or `Confirmed` finding.
- The owning service is clearly not in any repo you have access to.
- The alert is transient and already auto-resolved by the time you start.

When you report `inconclusive`, add one short follow-up line in the same thread naming what would have closed the gap — be concrete and actionable so the on-call can grant the missing capability. Examples:

- *"Inconclusive — `conversations.history` on `#oncall-payments` denied; need that channel added to my Slack-app scopes to see the upstream alert."*
- *"Inconclusive — service `billing-worker` isn't in any repo I can read; need access to `augmentcode/billing-internal` (or a pointer to where its source lives) to trace the failing job."*
- *"Inconclusive — Prometheus `query_range` on `http_request_duration_seconds` returned 403; need read access to the `prod-us-central1` metrics project."*
- *"Inconclusive — exhausted 15 tool calls before finding a `High` cause; ran logs + recent-deploys + dashboard. Would help next time: a runbook for `<alert-name>` or a sample known-good trace ID for this service."*

If nothing specific would have helped (the signal genuinely is too thin), say so explicitly — *"Inconclusive — no additional context would have changed the verdict; the alert body and thread carry no actionable signal"* — rather than omitting the line.
