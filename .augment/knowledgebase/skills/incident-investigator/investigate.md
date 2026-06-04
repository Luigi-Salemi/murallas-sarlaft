---
name: incident-investigator-investigate
description: Phase 2 investigation loop for an alert investigator — extract the alert's exact label/principal scope, query metrics and logs via the runtime's metrics-query and log-query skills, correlate with recent deploys/commits, label every finding `Confirmed` / `High` / `Tentative`, and stop on a bounded budget so the session does not chase tangents.
---

Goal: reach a `Confirmed` or `High`-confidence root cause, or decide this is not actionable. Stay strictly within the alert's declared scope; do not query across namespaces, services, or labels that are not in the alert definition.

## 0. Parse the alert scope first

Examine the alert's underlying query / custom details. Extract every label filter (especially scope-defining ones like `namespace`, `pod`, `endpoint`, `status_code`). Those filters define the **exact scope** that triggered the alert. ALL of your subsequent metric and log queries must stay within that same scope.

Also extract the **affected principal** when the alert is scoped to a single one — any UUID-shaped identifier (`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`) named `user_id`, `tenant_id`, `principal_id`, `customer_id`, `account_id`, or similar, sourced from the alert title, query labels, alert custom details, DLQ payload, or the triggering message text. Carry it forward verbatim. Use it to scope subsequent log queries (e.g. add the matching JSON-payload field to the log filter) and surface it in the *Incident Summary* per the post-structure skill. Do not attempt to resolve the UUID to a display name. When the alert scope is broader than a single principal, derive the affected identities from step 4a instead.

## 1. Understand the service

If a service-metadata tool is available in the runtime (e.g. one that returns app description, key metrics, dependencies, owning team), call it for the affected service. **Do not guess metric names** — take them from the metadata.

## 2. List pods and recent rollouts

Use the runtime's metrics-query and log-query skills (the adopting bundle's *Available skills* section names them) to determine active pods, recent restarts, and rollout history. The exact query language and field names come from the adopting bundle's *Infrastructure context* section.

For rollout history, query for the deployment controller's events, or check recent deploy commits in the same window. **A deploy / restart within minutes of alert time is the single strongest signal.**

## 3. Query metrics

Use the runtime's metrics-query skill, scoped to the alert's namespace/labels. Use a range query with start/end set to ~30 minutes before and ~15 minutes after the alert. Always aggregate — raw per-pod rates are rarely useful. Common shapes the investigator typically wants:

- Service error rate broken down by status / code dimension.
- Service error ratio (errors over total requests) over the same window.
- Memory usage per pod over the window.
- Restart count over the last 1h.

The exact metric and field names come from the adopting bundle's *Infrastructure context* section — substitute your own metric names where they differ from any examples provided.

## 4. Query logs

Use the runtime's log-query skill. Filter on the JSON-payload (or equivalent structured) fields that are *reliably populated* in your environment (the adopting bundle's *Infrastructure context* section calls out which fields are reliable and which are not). Start with a `severity>=WARNING`-equivalent filter, no regex, 1–2h window.

## 4a. Aggregate error logs by identity (concentration check)

When the alert scope is broader than a single principal, the cause is often a small set of identities producing most of the errors. Group the matching error entries from step 4 by each high-cardinality identity field reliably populated in your environment (user / tenant / model / session / request source / client version / endpoint / route — the adopting bundle's *Infrastructure context* section names them) and sort by count. The runtime's log-query skill usually exposes this as an aggregation; otherwise sample 50–100 entries and tally by hand.

When ≥50% of errors fall on a single value (or ≥80% on the top three), that concentration **is** the headline — carry the top values forward verbatim and surface them in the *Incident Summary* per the post-structure skill. If two distinct patterns are visible (e.g. timeouts on model A from user X *and* "not found" on model B from a cloud agent), keep both as separate findings in step 7, not a single collapsed cause.

## 5. Check pod health

Using the same metrics-query and log-query skills:

- Restart count last hour (metrics).
- OOMKilled / CrashLoopBackOff (logs, scoped to the alert namespace).
- Pending / not-ready replicas (metrics).

## 6. Correlate with code

Check recent deployments and merges. A deploy bundles many commits; any commit in the bundle could be the cause. Use `git log --since="{alert_time - 2h}" -- {paths}` to narrow once you have a candidate.

## 7. Label every finding

- `Confirmed` — direct evidence (stack trace + matching diff, or error rate collapses when rollout reverts).
- `High` — strong correlation, one missing link.
- `Tentative` — plausible, needs more evidence.

When step 4a surfaced two distinct patterns, label each as its own finding — the post-structure skill's *Likely Cause* accepts parallel findings, not only alternatives.

## 8. Stop conditions

Stop the loop when any of:

- You have a `Confirmed` finding, OR
- You have a `High` finding **and** you've made ≥5 independent checks, OR
- You've made 15 tool calls without progress (declare `investigation inconclusive` and stop).

Hand off to the post-structure skill to communicate findings.
