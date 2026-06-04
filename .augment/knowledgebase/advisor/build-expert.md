---
name: cosmos-build-expert
description: Design and create a bespoke Cosmos expert end-to-end from a conversational requirements gathering. Pick the trigger, identity, capabilities, and behavior with the user via ask-user, then apply the bundle with `auggie cloud expert apply -f`. The bundle file is an implementation detail — never shown to the user. Used by Advisor when the user wants a custom automation that the existing template catalog does not cover.
---

# Build a custom expert

Use this when the user wants an automation that the existing template
catalog does not cover. Stay in Advisor voice — brief, conversational,
in the team's language. Do not dump schemas, narrate field names, or
mention the bundle file. The artifact is an implementation detail; the
only thing the user sees is the resulting expert in their launcher and
a link to launch it.

## Reference material to consult before designing

Before designing a non-trivial expert, scan these on demand:

- see knowledgebase `guides/cloud/writing-expert-prompts.md` — the
  prompt-engineering patterns production experts apply (comment-header
  attribution, self-detection via session URL, sticky comments,
  output-format discipline, the question-as-stop-rule, the
  allowed-operations allowlist, and the lazy/inline `<include>`
  mechanism).
- see knowledgebase `expert-templates/` — apply examples for shape,
  capabilities, and trigger configuration. Match the closest
  template's structure rather than inventing a new one.
- see knowledgebase `guides/cloud/capabilities.md` — what each
  capability gives the agent and the GitHub vs `GITHUB_APP` / Linear
  vs `LINEAR_APP` distinction.
- see knowledgebase `guides/cloud/automations.md` — trigger types and
  JSONLogic filter patterns.
- see knowledgebase `guides/cloud/workers.md` — **required reading
  whenever the expert design uses `worker-launch`** (i.e. when
  `workerExpertIds` is set or `useAllExpertsAsWorkers: true`). Pay
  particular attention to § Manager Stop Rule and the cascade-on-archive
  item under § How Workers Work — a manager that calls
  `terminate-session` while a launched worker is still running will
  cascade-archive the worker and kill its task.
- see knowledgebase `guides/cloud/gitlab-environment-setup.md` (and
  any other `<integration>-environment-setup.md` page) when the user
  wires the expert to a source Cosmos does not expose as a built-in
  capability — § Non-built-in integrations below dispatches into the
  right per-integration guide.

## Conversational design loop

1. **Restate the goal** in one sentence so the user can confirm intent.
   If they correct, restate again.
2. **Gather only what is genuinely ambiguous** through `ask-user`, one
   question at a time, with **2–3** suggested responses each
   (recommended path first, one alternative, optional escape hatch).
   Common asks:
   - **Trigger**: how does this fire? Propose the 1–2 most likely from
     context — a GitHub event, a Linear event, a Slack message, a
     schedule, or only when the user launches it. Do not enumerate the
     full menu.
   - **Identity**: should the agent act as the human user, or as the
     Augment bot? User identity uses `GITHUB` / `LINEAR`; bot identity
     uses `GITHUB_APP` / `LINEAR_APP` and is required for any
     automation triggered by webhooks.
   - **Visibility**: just for the user, or shared with the team?
     Default to **`tenant`** — most experts on this platform end up
     shared with the team, and the `visibility:` field on every
     catalog template is already `tenant` for that reason. Pick
     `user` only when the user has explicitly framed the deployment
     as personal / private / a trial. The `user` → `tenant` flip is
     one click in expert settings but `tenant` → `user` requires
     recreating the expert from scratch — bring this up only as a
     tiebreaker for genuinely ambiguous cases, not as a reason to
     start `user`.
   - **Output destination**: post a comment, open a ticket, send a
     Slack message, write to VFS, or stay in-session.
   - **Memory**: ask whether the expert should learn from past
     sessions. Frame it briefly so the user can decide: "I can wire
     in lightweight memory — the expert reads a curated knowledge
     file at session start and auto-captures durable insights as
     breadcrumbs during the run, with a `📝 Remembered: …` heads-up
     so you can correct or veto each one. Memory sharpens the expert
     over time and is per-user when the expert is user-visible, or
     shared across the team when it's tenant-visible." Recommended
     `Yes, add memory`, alternative `No memory`. Default to **yes**
     for any expert that does recurring or repeating work; default
     to **no** for one-shot utilities where past sessions carry no
     useful signal. If the user opts in, follow knowledgebase
     `guides/cloud/expert-memory.md` § Wiring memory into a bespoke
     expert when constructing the bundle.
   - **Non-built-in integration**: if the user wires the expert to
     a source Cosmos does not expose as a built-in capability
     (today: GitLab — any mention of GitLab, a GitLab repo URL, or
     a merge request), switch into § Non-built-in integrations
     below before designing the expert.
3. **Skip any question whose answer is obvious from the request.** Do
   not pad with options the user has not asked for.
4. **Breadcrumb-replay only short-circuits design questions.** When
   Advisor memory (`experts/advisor/breadcrumbs/global.md`) records
   prior decisions for a similar expert — visibility, identity,
   trigger shape, output destination — reuse them and skip the
   matching `ask-user`. It never skips integration setup or
   verification: the `gitlab-token` (or equivalent) secret, the
   per-integration `## Setup flow`, and `## Verify the integration`
   all run on every deploy because tenant secret state, environment
   IDs, and webhook config vary across sessions and across users.
   A breadcrumb that says "env + token are reused from a prior
   session" is a hint to confirm, not a license to skip.

## Construct the bundle (internal — never shown to the user)

Build the bundle as `apiVersion: poseidon.augmentcode.com/v1alpha1`,
`kind: ExpertBundle`. The parser is strict: field names are camelCase
and unknown keys are rejected. Working envelope:

```yaml
apiVersion: poseidon.augmentcode.com/v1alpha1
kind: ExpertBundle
metadata:
  name: <kebab-case-id>
spec:
  expert:
    displayName: <human-readable label>
    description: <one-line summary, ≤120 chars, no newlines>
    visibility: user                # or "tenant" once the user agreed to share
    systemPrompt: |
      <multi-line prompt for the new expert, in its own voice,
      applying the patterns from writing-expert-prompts.md>
    model: ""                       # leave blank unless the user specified one
    includeDefaultSystemPrompt: true
    # Optional: set true only when sessions from this expert should auto-archive after idle.
    # autoCleanupOnIdle: true
    capabilities:                   # smallest set the new expert needs
      - WEB_ACCESS
    initialMessages: []
    # Optional. If set, keep ≤280 chars / 1–2 short sentences.
    userInstructions: ""
    # Optional home-page chat composer placeholder. Omit or leave empty to use the default.
    # If set, keep ≤80 chars, single line.
    placeholderText: ""
    workerExpertIds: []
    useAllExpertsAsWorkers: false
  triggers: []                     # populate with the user's confirmed trigger; leave empty for user-launched experts or for the staged-rollout path
```

If the user confirmed a recurring schedule or an event trigger,
apply the bundle with that trigger entry in `spec.triggers` and
**armed** — do not set `enabled: false` unless the user explicitly
asked to create the trigger disabled. The empty `triggers: []` shape
above is the correct value when the expert is user-launched (no
events, no schedule) or when the user opts into the staged-rollout
path (see `## Report back`). Build the trigger entry per the trigger
schema in knowledgebase `guides/cloud/automations.md` (already listed
in the reference material above).

**Confirm the Environment before filling — or knowingly omitting —
`spec.expert.environment.id`** (omitting falls through to the
user → team → platform default cascade; see knowledgebase
`guides/cloud/environments.md`). Use
`auggie cloud environment get-default` (run for `--scope personal` and
`--scope team`) to see what would resolve, and
`auggie cloud environment list` (no `--json`) to map IDs to names and
surface alternatives. Then `ask-user` with the resolved name, flagging
what the image carries (repos, env vars, pre-baked agent config like
MCP servers) — recommended `Use <Env name>`, alternative
`Pick a different Environment`. Fill the field only on explicit go.

## Confirm before creating

Summarize the expert in 2–5 short bullets in plain language — what it
does, when it fires, who it acts as, who else can launch it, and which
Environment it runs in — and `ask-user` with **2 suggested responses**.
For an expert with a confirmed schedule or event trigger: recommended
`Create it now with the trigger armed`, alternative `Let me try it
once before it auto-runs` (staged rollout — see `## Report back`). For
a user-launched expert (no schedule, no event): recommended
`Create it now`, alternative `Adjust …` (with the most likely change
called out). Treat the explicit "go" as the gate; do not run `apply`
without it.

For any capability or trigger the bundle uses that depends on a tenant
integration (`GITHUB`/`GITHUB_APP`→`github-user`/`github-app`,
`LINEAR`/`LINEAR_APP`→`linear-user`/`linear-app`, `SLACK` and `slack`
trigger→`slack-team`), include one line in the summary with the
current status from `auggie cloud integration status` and link
`<base>/app/integrations` for any `not connected` (`<base>` per the
report-back below). Don't gate `apply` on the result; just be honest
that the expert won't act on those events / tools until the user
finishes the connect flow there.

Verification of any non-built-in integration the bundle reaches
(anything wired through a custom environment rather than a Cosmos
capability — today, GitLab via knowledgebase
`guides/cloud/gitlab-environment-setup.md`) runs **after** the expert
is created, not here — the Advisor's own session cannot exercise the
integration, and there is no expert to point a fresh session at until
`apply` lands. See `## Verify the integration` below.

## Create the expert

On the user's go, write the bundle to `/tmp/<kebab-case-id>.yaml` and
run:

```
auggie cloud expert apply -f /tmp/<kebab-case-id>.yaml
```

`apply` prints a `Created expert <name> (<expertId>)` line on stdout —
parse the `<expertId>` from there.

If apply fails, surface the actual error in plain language (drop file
paths, drop schema noise) and `ask-user` with 2 suggested responses:
`Adjust and retry` (call out the most likely fix) or `Cancel`.

## Verify the integration

Run this only when the bundle's environment is a non-built-in
integration (today: GitLab via knowledgebase
`guides/cloud/gitlab-environment-setup.md`). For built-in capabilities
and plain default environments, skip straight to `## Report back`.

Verification is Advisor-driven through a dedicated **verify-`<integration>`-env**
expert (today: `expert-templates/verify-gitlab-env.yaml.template`). Its
system prompt runs the shell commands sent in the first user message
verbatim and ends with `VERIFICATION_RESULT: PASS` or
`VERIFICATION_RESULT: FAIL <reason>`. The Advisor launches a session,
polls for the marker, and routes pass/fail — the user copies and
pastes nothing. The launch link in `## Report back` is **gated** on
this passing.

1. **Resolve the verifier expert id.** Find `verify-<integration>-env`
   in `auggie cloud expert list`. If absent on the tenant, apply it
   once from `knowledgebase/expert-templates/verify-<integration>-env.yaml.template`,
   substituting `<GITLAB_ENVIRONMENT_ID>` with the integration env
   created earlier in this flow; parse the new id from `expert apply`
   output. Cache for subsequent verifications.

2. **Build the message.** Take the substituted verification commands
   from the integration guide's `## Verification` block (for GitLab,
   knowledgebase `guides/cloud/gitlab-environment-setup.md` § Setup
   flow step 3; substitute `<group>`, `<project>`, host, etc. from
   the inputs gathered there — pick the first repo if several).
   Append a `Pass criteria:` block lifted verbatim from the same
   `## Verification` section so the verifier's default-PASS rule is
   overridden with the integration's real criteria.

3. **Launch and poll.**
   ```
   auggie cloud session create --expert <verifier-expert-id> \
     --name "verify <integration> setup" \
     --message "<commands + Pass criteria block>"
   auggie cloud session sync --agent-id <session-id>
   ```
   Poll `session sync` every 5–10 s. Read
   `~/.augment/sessions/<session-id>.json` and scan the latest
   assistant turn for a line beginning with `VERIFICATION_RESULT:`.
   Soft-cap at ~90 s; no marker in that window is a fail with reason
   `verifier did not return a result in 90s`.

4. **Route on the marker.**
   - **PASS** → proceed to `## Report back`. Include the verifier
     session URL (`<base>/session?agentId=<sessionId>`) as a "verified
     here" breadcrumb in the report-back message.
   - **FAIL** → surface `<reason>` in plain language and `ask-user`
     with `Adjust and retry` / `Cancel`. Typical fixes (re-store the
     token with the missing scope, rebuild the env) are named in the
     guide's `## Verification` section. A retry re-runs step 3
     against a new session.

New integrations land as a paired `<integration>-environment-setup.md`
guide page + `verify-<integration>-env.yaml.template`; this section
covers them without edits here.

## Report back

On success, post one short message: name of the expert, what it does
in one phrase, and a launch link the user can click:

```
<base>/app/home?expertId=<expertId>
```

`<base>` is the scheme + host from the `session_url` in
`augment-cloud/session-metadata.md`, the same construction the
deep-link handoff in the Advisor playbook uses.

If the user picked `Create it now with the trigger armed` (or the
expert has no schedule/event trigger), the work is done. If they
picked `Let me try it once before it auto-runs`, follow the
staged-rollout pattern: clear `spec.triggers` to `[]` before `apply`
so the deep link above hands off a quiet expert, and explicitly tell
the user the trigger is **not yet armed** — you'll re-apply with
`spec.triggers` populated when they report back saying they want it
armed. Never stage the rollout unprompted; it is only ever the
user-chosen path.

## Non-built-in integrations

For sources Cosmos does not expose as a built-in capability, the
bundle reaches the source through a custom environment rather than a
`*_APP` capability. The per-integration setup flow runs **before**
`## Construct the bundle` — the bundle needs the integration's
environment ID and capability/trigger shape before it can be
assembled.

Per-integration setup pages live under knowledgebase `guides/cloud/`.
Each ships a `## Setup flow` section that the Advisor walks the user
through, plus a paired `verify-<integration>-env` template that
powers `## Verify the integration` above.

Today:

- GitLab → knowledgebase `guides/cloud/gitlab-environment-setup.md`

Cross-cutting rules every integration's setup flow follows
(individual guides may extend or specialize these):

- **Prefer a service-account-style token regardless of visibility.**
  Recommend the integration's long-lived non-personal credential
  (GitLab Service Account, Bitbucket repository access token, etc.)
  even when the expert is `visibility: user`. The user → tenant flip
  is one click in expert settings, and the moment it happens every
  action posts under the original human's name and the expert
  breaks the day they leave the org. Fall back to a per-human token
  only when the integration / tier does not support a service
  account at all; say that explicitly. Per-integration setup pages
  spell out the tier/role prerequisites and the creation walkthrough
  (for GitLab, knowledgebase `guides/cloud/gitlab-environment-setup.md`
  § Create a GitLab Service Account).
- **Secrets live in the secret manager.** Ask the user to store the
  integration's credentials via `auggie cloud secret set <name>` or
  `<base>/app/secrets`. Do not proceed until they confirm the
  secret is actually stored — "I'll do it later" or "the expert can
  read it at runtime" surfaces as an opaque verifier failure rather
  than as the clear setup gap it is.
- **Capabilities** are usually `WEB_ACCESS` + `CUSTOM_WEBHOOK`; the
  integration's CLI/API access comes from the environment, not a
  `*_APP` capability.
- **Live events** ride on custom webhooks
  (`auggie cloud webhook create --type <integration>`) with
  `source: "CUSTOM"` runtime subscriptions and payload filters; fall
  back to scheduled polling if webhooks are unavailable.

Each guide's `## Setup flow` owns the integration-specific details:
required token scopes, environment template path, repo layout,
verification commands, and per-integration nuances.
