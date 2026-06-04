---
name: backlog-dispatcher-rubric
description: Single judgement-based decision rubric for the Backlog Dispatcher. Defines what the dispatch path (dispatch to PR Author) and the skip path mean, lists the small set of hard safety overrides that always force Skip path, and gives the worker-launch message body. Trusts the agent's judgement on the open call rather than enumerating exhaustive criteria.
---
# Dispatch rubric

You have **one** ticket in front of you. Pick exactly one of two paths
per ticket. Use your judgement — the criteria below are guidance, not
a checklist.

## Dispatch path — Dispatch to PR Author

Pick the dispatch path when a competent engineer reading the ticket
would just open a small PR rather than reply with "what do you
actually want?" or escalate to a designer first. The kinds of tickets
that typically fit:

- Bugs with a concrete reproduction, stack trace, or specific
  page/endpoint, where the fix obviously belongs in one place.
- Mechanical changes that read like a recipe ("add field X", "expose
  helper Y via the CLI", "add a metric next to the existing one").
- Doc / copy / comment fixes pointing at a specific file or page.
- Small, well-localised refactors with an obvious end-state.

## Skip path — Skip (leave for a human)

Everything else. Common Skip-path shapes:

- Vague asks ("make X better", "improve onboarding", "we should
  think about Y").
- Tickets that read like a design discussion or a product proposal.
- Anything where you can't name the file/area the work would touch
  with reasonable confidence.
- Tickets where the reporter is still figuring out what they want.

When you pick the skip path, also produce a one-sentence
`<SKIP_REASON>` — a plain-language reason a human reviewer can scan
later (e.g. `"Vague ask — no concrete acceptance signal."`,
`"Hard override: touches authentication."`, `"No file/area I could
name with confidence."`). The scan loop posts this on the ticket
alongside the `cosmos-skipped` label so adopters can calibrate the
rubric post-deployment.

## Hard Skip-path overrides (non-negotiable)

Even when the dispatch path would otherwise fit, choose the skip path
if the ticket touches any of:

- Authentication, authorization, billing, payments.
- Secrets, credentials, tokens, PII handling.
- Schema migrations, data backfills, persistent-storage shape changes.
- A new public API surface or breaking changes to an existing one.
- A new dependency, new infra component, new feature flag, or new
  deploy-time configuration.
- Anything explicitly tagged `needs-design` / `needs-spec` /
  `blocked` / `do-not-touch`, or assigned to a specific human.

These are real risk areas where a wrong PR is expensive — defer to
humans regardless of how clear the ticket reads.

## Soft signals (use as priors, not rules)

The ticket's own labels and shape are signals you can weigh:

- A `bug` / `Bug` label with a concrete repro is usually the dispatch path.
- An `enhancement` / `Feature` label without a concrete acceptance
  signal is usually the skip path.
- A ticket with both labels is unusual — read the body and decide
  based on what the work actually looks like.
- An untriaged ticket with no label and a vague body is almost
  always the skip path.

These are priors, not gates. A `bug`-labelled ticket that is actually
a redesign request is still the skip path; a `enhancement`-labelled
ticket that is actually a one-line copy fix is still the dispatch path.

## When in doubt

Pick the skip path. Skipping a borderline ticket costs us nothing — a
human will look at it on the next triage pass. Dispatching the wrong
one wastes review attention and erodes trust in the bot.

# Dispatch path — PR Author worker-launch message

When you pick the dispatch path, launch a worker from expert **PR Author
(GitHub)** with this message body (substitute placeholders, drop
sections that don't apply):

```
SOURCE: ticket-dispatcher
Source ticket: <TICKET_URL>
Title: <TICKET_TITLE>
requested_by_name: <REQUESTER_NAME>
requested_by_link: <REQUESTER_LINK>

Summary of the requested change (1-3 sentences distilled from the
ticket):
<ONE_TO_THREE_SENTENCE_SUMMARY>

Concrete signal from the ticket — repro / stack trace / acceptance
example — that made this look dispatchable:
<EVIDENCE_QUOTED_OR_SUMMARISED>

Suggested area of the codebase to start in (best-effort from the
ticket; verify before editing): <BEST_EFFORT_AREA>

When you open the PR:
- Open it as **Ready for Review**, not as a draft. A human reviewer
  needs to see it on their queue.
- For a GitHub Issue source: include `Closes #<N>` in the PR
  description so the issue auto-links and auto-closes on merge.
- For a Linear source: mention the identifier (e.g. `AU-1234`) in
  the PR title or description so Linear's GitHub integration
  attaches the PR to the issue.
- Keep the change small and contained. If you find that the ticket
  actually requires a redesign, schema change, new dependency, or
  cross-system work, stop and report back — do not open the PR.
```

`<REQUESTER_NAME>` and `<REQUESTER_LINK>` come from the source
skill's field map (Linear ticket creator or GitHub issue reporter).
PR Author renders them as a `Requested by:` line in the PR body per
its attribution rules. If the source skill could not resolve a
requester (`creator` was null), omit both `requested_by_name` and
`requested_by_link` lines from the worker message — PR Author then
falls back to "no requester" rather than inventing one.

The `SOURCE: ticket-dispatcher` header marks this as a delegated
launch so PR Author uses bot-auth attribution and does not
self-assign the PR.

The scan loop handles the label updates and waiting; this rubric
only defines the criteria and the worker message body.

# Skip path — action

The scan loop applies the `cosmos-skipped` label and posts one short
comment carrying your `<SKIP_REASON>`. Keep the reason a single
sentence — it's the audit trail, not a conversation.
