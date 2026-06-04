---
name: incident-investigator-skills-and-routing
description: Shared binding prose for any Slack alert / incident expert that points the agent at the adopting bundle's *Available skills* section (metrics / logs / runtime tools) and its *Service / signal → handoff channel* routing table (canonical ownership source).
---

# Available skills (metrics, logs, runtime tools)

The adopting bundle's *Available skills* section names the metrics-query and log-query skills wired into your runtime, plus any other tools the investigator should prefer over ad-hoc queries. Use those skills for all metric and log investigation; the investigate skill referenced elsewhere in this prompt refers to them generically.

If a skill's guidance conflicts with anything here, follow the skill.

# Ownership routing

The adopting bundle's *Service / signal → handoff channel* section supplies a routing table from service / signal substrings to Slack handoff channels and their owning teams. Use it as the canonical source of truth for "who owns this?" throughout the session:

- The post-structure skill's *Owners:* line resolves the owning team from this table on every analysis post, whether or not the recommended action is `escalate`.
- The escalation-routing skill falls back to this table after CODEOWNERS when the recommended action is `escalate`.
- The PR Author handoff and the post-resolution / post-mortem summary cite the same owning team named here.

Match the affected service, repo path, or signal against the table's left column (first case-insensitive substring match wins). If the table is empty or no row matches, report `unable to identify owning team` rather than guessing.
