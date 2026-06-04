# Writing Expert Prompts: Patterns from the Shipped Templates

The four templates in `expert-templates/` (`pr-author.yaml.template`, `pair-reviewer.yaml.template`,
`pr-risk-analyzer.yaml.template`, `deep-code-reviewer.yaml.template`) demonstrate
patterns that have proved useful for production Cosmos agents. Reach for them
when writing your own.

## 1. Comment header attribution

Every comment the agent posts to GitHub starts with a one-line `<sup>` header
containing the agent role, the **session URL**, and the human user it's acting
on behalf of. The session URL doubles as a stable identifier (see
self-detection below).

```
<sup>[**PR Author Agent**]({{session_url}})⚡ on behalf of @{{github_username}}</sup>
```

The Pair Reviewer template uses two header variants — one for individual
findings ("on behalf of @user") and one for the final verdict ("with @user's
authorization") — to distinguish discovery from human-approved publishing.

Values come from the [Session Metadata Rule](sessions.md#session-metadata-rule).

## 2. Self-detection via session URL

Multiple agents may share the same GitHub bot username (e.g.
`augmentcode[bot]`), so the **bot username is not a reliable self-marker**.
Identify your own comments by checking for your own session URL in the comment
header instead. Three classes:

- Comment with **your** session URL → ignore (it's already you).
- Comment with a **different** session URL or no header → another agent;
  respond carefully to avoid agent-to-agent loops.
- Comment with no header at all → human; respond normally.

## 3. Sticky comments via HTML markers

For agents that produce a single canonical report (verification result, status
summary, etc.), use a hidden HTML marker comment to find and **update** the
existing comment instead of posting a new one each run:

```html
<!-- my-agent-results -->
```

The agent searches the PR for a comment containing the marker; if one exists
it edits in place, otherwise it creates a new one. This keeps the PR thread
clean across many repeated runs.

## 4. Output format discipline

Templates declare their conversational output formats up front using
`<output_format>` blocks, then refer to them by name throughout the prompt.
This includes a fixed three-part phase structure (Overview / "Here is what you
should understand" / Findings) and a fixed severity scale (`BLOCKER`,
`SUGGESTION`, `NIT`). The PR Author template adds an "ONLY a short sentence"
rule for assistant messages: status is communicated by tool calls, not by
narration.

## 5. Stopping rule (turn-handoff)

For interactive agents, treat **any question to the human as the end of your
turn**. Nothing — no tool calls, no findings, no transition sentences — may
follow the question. The Pair Reviewer template phrases this as a top-priority
rule that overrides all other instructions, paired with an acknowledgement
rule: when the human responds, always acknowledge what they said before doing
anything else.

This prevents the common failure mode where the agent asks "should I proceed?"
and immediately proceeds without waiting for an answer.

## 6. Allowed-operations allowlist

For agents that mutate external state, encode the **allowed write operations**
directly in the prompt as a hard-coded allowlist. Pair Reviewer pins itself to:

```
GET *
POST */comments
POST */pulls/*/reviews
```

A read-only variant for a self-review use case would tighten this further
to `GET *` only — generating findings into the conversation without posting
anything externally. This works as a soft scope inside the GitHub capability
(which is otherwise unconstrained write access on the user's behalf).

## 7. Tool availability self-check

Have the agent check for required tools at the very start of its first turn
and **fail fast** with a single short message if anything critical is missing,
rather than half-completing the task. PR Author does this for the GitHub API
tool:

```
If no GitHub API tool is available: "No GitHub API tool available."
```

## 8. Activity state machine for long-running agents

Long-running agents that hold subscriptions (e.g., one agent per open PR)
should manage their own polling cadence to avoid wasting compute on quiet
work. PR Author defines three states:

| State | Polling | Entry condition |
|-------|---------|-----------------|
| **Active** | Every 30 minutes | Default; entered on a new comment in any state |
| **Idle** | Every 3 hours | No activity for 2 days |
| **Dormant** | No polling | No activity for 7 days; agent posts a "going dormant" note |

Transitions are evaluated on each scheduled `subscribe-event` tick by
unsubscribing the old cron and subscribing a new one. Receiving a comment
event always returns the agent to Active.

## 9. Intent → evidence → verdict (ground truth in observation)

For verification or audit agents, separate three steps that are easy to
collapse:

1. **Capture intent first.** Before choosing any tool, write down (a) the
   intended behavior change, (b) the verification surface where it should be
   observable, and (c) the concrete observable outcome that would prove or
   disprove it.
2. **Plan evidence before capturing it.** Decide which screenshots, RPC
   responses, log lines, or CLI outputs are required for the verdict. Do not
   capture evidence "just in case."
3. **Verdict is grounded only in runtime observation.** Do not substitute
   code reading or static analysis for runtime proof. If runtime evidence is
   inconclusive, classify the run as `infra-failed` or `blocked` rather than
   guessing from the diff.

Pair this with a fixed outcome vocabulary (`passed`, `failed`, `infra-failed`,
`blocked`) that distinguishes product failures from setup failures.

## 10. Anti-rabbit-hole rules

For agents that touch ambiguous external systems (CI, deployments, browsers),
include an explicit "do not do X" list of common failure modes near the end of
the prompt. For example, a verification agent might list: "do not drift into
generic code review", "do not substitute local builds for runtime verification",
"do not keep exploring once the verdict is clear", "do not retry the same
failing setup without new information".

These rules trigger the agent to recognize and exit unproductive loops it
would otherwise stay in.

## 11. Idempotency check before action

Auto-triggered experts can fire more than once for the same event (webhook
retries, re-deliveries after a failed dispatch, multiple matching triggers).
Before taking any side-effecting action, the prompt should tell the agent to
look for evidence that a previous run already handled the event.

For PR-triggered experts, the easiest signal is the agent's own bot comment:
*"Check the PR comments to see if a 'PR Author Expert' has already been
started. If so, do not start a new one."* For Linear-triggered experts, look
for an existing comment authored by the bot user.

Pair this with a sticky-comment marker (pattern #3) so the check is robust
against PR title changes.

## 12. Two-path decision template with explicit output blocks

For triage agents that must take exactly one of two actions (approve / send
to deeper review, ack / escalate, low-risk / requires-review), structure the
prompt as:

1. A **Decision Logic** section listing positive examples for the
   "lightweight path" (typo fixes, doc-only changes, dependency bumps).
2. **Safety Rules** that override the lightweight path even when criteria
   match (touches `services/auth/`, schema migrations, generated files,
   anything you don't fully understand).
3. Two **fenced output templates** — one per path — that the agent must use
   verbatim, with header text the agent recognizes as its own on subsequent
   runs (see pattern #1).
4. **Important Rules** at the end: "produce exactly one write action per
   event", "if unsure, choose the cautious path", "do not include extra
   commentary outside the template".

This shape forces the model to commit to one branch and prevents the common
failure where a triage agent both auto-approves *and* posts a long analytical
comment.

## 13. Slack output formatting and threaded replies

Slack uses `mrkdwn`, not Markdown. Agents writing to Slack must be told:

- Bold is `*bold*`, not `**bold**`.
- Bullets use `•`, not `-` or `*`.
- Links are `<https://url|link text>`, not `[link text](url)`.
- No `#` / `##` headers — use bold lines instead.
- Emoji use shortcodes (`:rotating_light:`, `:white_check_mark:`).

For long updates, use a **main message + threaded reply** so the channel
doesn't get spammed: post the headline first via `chat.postMessage`, capture
the returned `ts`, then post the detail with `thread_ts` set to that value.
A recurring daily-digest expert uses this pattern to keep its target channel
tidy.

Channel routing should be table-driven by severity or event type rather than
hard-coded — an incident-routing expert can use a
`| severity | channel | when |` table so the routing logic is data, not
branching prose.

## 14. Cross-agent state in the organization VFS

The organization VFS (`$HOME/.augment/vfs/<agent-id>/org/` — i.e.
`~/.augment/vfs/<agent-id>/org/` locally and
`/root/.augment/vfs/<agent-id>/org/` in cloud VMs) is a persistent
filesystem visible to every agent in the organization. Use it as a
**simple shared state store** for follow-up agents that need to consume
what an earlier agent produced. (A backward-compat `tenant/` symlink to
`org/` is maintained so older expert prompts referencing `tenant/`
continue to work.)

The pattern that works well is **append-only JSONL with deduplication**:

- Agent writes one JSON line per record to a stable path like
  `analytics/triage-results.jsonl`.
- Before appending, the agent reads the existing file and skips records it
  has already written (dedup by a stable key like `pr_url`).
- When the file approaches the 1 MB per-file limit, rotate to
  `triage-results-YYYY-MM.jsonl`.
- Reader agents `grep`/`jq` over the file with normal shell tools — there
  are no special VFS APIs.

Constraints to bake into the prompt: 1 MB per file, 10,000 files total,
100 MB total filesystem size. Tell the agent to **never overwrite or
truncate** the file — only append.

## 15. Composable skills via `<include>` directives

A `systemPrompt` can pull in other Markdown files at expert-apply time
and at session-start time using `<include>` directives. Use this to
factor a long prompt into reusable skill snippets, share boilerplate
across experts, or reference team breadcrumbs without copy-pasting
them into every bundle.

### Syntax

Directives are **self-closing** XML tags on a line of their own. The
parser only matches `<include ... />`; non-self-closing block forms
(`<include>...</include>`) are ignored and left in the rendered prompt
as literal text.

```
<include src="kb://guides/cloud/sessions.md" />
<include src="kb://guides/cloud/sessions.md" mode="inline" />
<include src="vfs://org/experts/triage/breadcrumbs/recent.md" mode="lazy" />
```

- `src` — required. URI scheme picks the root:
  - `kb://PATH.md` → resolves under the local knowledgebase
    (`~/.augment/knowledgebase/PATH.md`).
  - `vfs://org/PATH.md`, `vfs://user/PATH.md`, and the legacy
    `vfs://tenant/PATH.md` → resolve under the session's VFS roots.
    `vfs://org/...` reads from `~/.augment/vfs/<agent-id>/org/...`;
    `vfs://user/...` resolves to `.../user/...`. `vfs://tenant/...` is
    the legacy alias for the organization root, kept for backward
    compatibility and resolving to `.../tenant/...`.
  - The path component must end in `.md`, contain only
    `[a-zA-Z0-9_\-/]`, and have no `.`/`..` segments — anything else is
    rejected the same way as a missing file.
- `mode` — optional, `inline` (default) or `lazy`.
  - `inline`: the resolver reads the file at session start, recursively
    resolves any nested `<include>` directives in it, and wraps the body
    in a `<prompt-module name="..." src="...">` boundary in place of the
    directive (the `name` is the target's filename stem, `src` the
    authored URI). Front matter is stripped before insertion.
  - `lazy`: the directive is replaced with a short `<lazy-prompt-module>`
    block carrying the target's `description` and an explicit `auggie
    cloud prompt-module render <URI>` command. The body is not inlined;
    the agent runs the render command on demand (the runtime injects a
    rule telling it to do so when the block's situation applies). Use
    this for large or rarely-needed skills so the system prompt stays
    small.
- The `description` shown in a lazy `<lazy-prompt-module>` block is read
  from the included file's YAML front-matter `description:` field
  (inline scalar or a `>`/`|` block scalar — block-scalar continuation
  lines are joined with spaces). It is **not** taken from text between
  `<include>` tags (which the parser does not support). A lazy include
  whose target file has no `description:` field, or an empty one, is
  rejected by `auggie cloud prompt-module render` with `lazy include ...
  requires a non-empty description in its front matter`, and degrades the
  session at start (see below) rather than failing apply.
- A lazy target **may** itself contain `<include>` directives; they are
  resolved when `auggie cloud prompt-module render` runs, not at
  session-start render.

### When the resolver runs

- **`auggie cloud expert apply` and `validate`** lint the include tree:
  syntax, cycles, and depth (max **8** levels). `kb://` existence **is**
  checked at apply time when `~/.augment/knowledgebase` is synced
  locally (`lintExpertPromptIncludes` in
  `clients/cli/src/cli/commands/cloud-agent/expert/render-expert-prompt.ts`
  passes the local KB dir into the linter); on machines without a synced
  KB, `kb://` existence is skipped and only structural checks run.
  `vfs://` existence is always skipped at apply time — VFS roots only
  exist on the Cosmos agent VM. The full existence check for both
  schemes happens at session start.
- **At session start** the runner renders the entire include tree
  against the local KB and the session's VFS roots. If a directive
  fails to resolve (missing file, escapes the root via symlink, exceeds
  depth, or a lazy include lacks a front-matter `description`), the
  session still starts in a **degraded** state: an
  `<expert-prompt-include-warning>` block listing the offending chains
  is inserted into the rendered prompt and the agent is told to flag the
  degradation. Apply/`validate` linting catches the structural failures
  before deployment, but does not parse front matter, so a missing lazy
  `description` surfaces only at render.
- **`auggie cloud prompt-module render <URI>`** renders a single module
  on demand, expanding its nested includes. This is the command a
  `<lazy-prompt-module>` block tells the agent to run, and it also
  previews any `kb://` or `vfs://` module by hand.

### Patterns

- **Shared house style.** Put project-wide tone/format rules into
  `kb://patterns/house-style.md` and `<include>` it from every expert
  prompt. One edit updates every expert next session.
- **Team breadcrumbs as lazy skills.** Reference
  `vfs://org/experts/<team>/knowledge/<topic>.md` with `mode="lazy"`
  so the breadcrumb file ships as a `<lazy-prompt-module>` pointer
  instead of bloating the prompt; the agent renders it only when it
  needs it.
- **Composing roles.** A "PR Risk Analyzer" prompt can include both
  `kb://patterns/pr-comment-format.md` and
  `kb://patterns/risk-rubric.md` to inherit two orthogonal sets of
  rules without duplicating either.

### Gotchas

- The renderer enforces "real path inside the declared root" — symlinks
  that escape `kb://` or `vfs://...` boundaries are rejected. Keep
  included files inside their root.
- `vfs://` URIs only work when the session has at least one VFS sync
  manager active. An expert with no VFS access that includes a
  `vfs://` directive will fail at session start.
- Running `auggie cloud expert validate` does **not** prove a `vfs://`
  URI will resolve at session start; it only checks structure. Test
  with a real session.
