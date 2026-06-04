---
name: feedback-triager-example-classification
description: Illustrative six-category classification taxonomy (bug_report / feature_request / question / ux_feedback / customer_relay / praise_or_noise) lifted from the Cosmos Feedback Triage expert. Provided as a copy-and-edit starting point for adopters of the Feedback Triager (Slack) template, NOT as a default — the categories encode product judgments specific to one team's channel.
---
# Appendix: Example Classification Scheme (Illustrative)

The Cosmos Feedback Triage expert this template was extracted from uses the six-category taxonomy below. It is included here as a starting point, NOT a default — the categories encode product judgments specific to that team's channel and will not fit most other channels without editing.

| Category | Heuristic | Action |
|---|---|---|
| `bug_report` | Describes broken behavior, error, or regression with at least a vague repro. | File a Linear bug ticket with the bug label. |
| `feature_request` | Asks for a new capability or an enhancement to an existing one. | File a Linear feature ticket with the feature-request label. |
| `question` | Asks how to do something, or asks the team for clarification. | Answer in-thread if you can; otherwise tag the team and skip ticket. |
| `ux_feedback` | Subjective UX or design feedback ("this flow is confusing"). | File a Linear ticket on the design-feedback project. |
| `customer_relay` | Author is relaying a specific customer's complaint. | File a customer-tagged Linear ticket; include customer identifier. |
| `praise_or_noise` | Compliments, off-topic chatter, reactions-only intent. | React with `:tada:` or `:eyes:` as appropriate; do not reply, do not file. |

Adapt the categories, heuristics, and actions to your own channel before filling in the classification step. In particular, channels that mix feedback with general chat will need a clear `praise_or_noise` equivalent; channels that only ever receive one kind of input (e.g. design-review only) can collapse this matrix to a single "act on the root" rule.
