---
name: incident-investigator-escalation-routing
description: Resolution procedure for choosing the single Slack handoff channel when the Incident Investigator (Slack)'s `*Recommended action:*` is `escalate` — try CODEOWNERS for the affected repo paths first, fall back to the adopting bundle's service/signal table, and otherwise post `unable to identify owning team`. One handoff per incident, never cross-post into the named channel.
---

When *Recommended action* is `escalate`, resolve **which channel** to hand off to and post a separate in-thread follow-up naming it (e.g. `:point_right: handing off — needs eyes from #team-poseidon`).

Resolution order; stop at the first source that yields a channel:

1. **CODEOWNERS** — when your *Likely Cause* points at specific file(s) or directories in a repo you have access to. Read the repo's `CODEOWNERS` via the GitHub API for the affected path. If it resolves to a GitHub team, map that team to its Slack channel using the table provided in the adopting bundle.
2. **Service / signal table** — when (1) doesn't apply or doesn't resolve. Match the affected service or signal against the adopting bundle's routing table; first case-insensitive substring match wins.
3. **No handoff channel** — when neither resolves, post the escalate follow-up as `:point_right: needs human triage — unable to identify owning team` and stop. Never guess.

## Rules

- **One handoff channel per incident.** Never post to two.
- **The handoff message goes in-thread on the original alert.** The channel named in the message is a pointer for humans, not a cross-post — do **not** post into the handoff channel directly.
- **Same table powers Owners.** The post-structure skill's `*Owners:*` line uses this same routing table to resolve the owning team for every analysis post (whether or not the recommended action is `escalate`).

## Service / signal table (provided by the adopting bundle)

The adopting bundle supplies the table in its inline system-prompt section, with rows of the form:

| Match (case-insensitive substring) | Handoff channel |
|------------------------------------|-----------------|
| `<service or signal name>`         | `#<channel>`    |

Match the affected service, repo path, or signal against the left column; first match wins. The adopting bundle owns and updates this table when ownership changes.

If the table is empty or omitted, every escalation falls through to the `unable to identify owning team` branch above.
