# Knowledgebase Release Notes

## v1.9.2 — 2026-06-03

### Prompt-module rendering sync (CLI PR #55038)

- `AGENTS.md`, `guides/cloud/writing-expert-prompts.md`, `README.md`:
  brought the `<include>` lazy-mode docs in line with the shipped
  renderer. Lazy includes now render as a `<lazy-prompt-module>` block
  carrying the target `description` plus an `auggie cloud prompt-module
  render <URI>` command — the old
  `<skill-ref src="ABSOLUTE_PATH">DESCRIPTION</skill-ref>` pointer was
  removed. Lazy targets may now contain nested `<include>` directives
  (the "must be a leaf" rule is gone; nested includes resolve when the
  render command runs). Inline includes render wrapped in a
  `<prompt-module name="..." src="...">` boundary. Documented the
  `<include-module>` compatibility alias and the new `auggie cloud
  prompt-module render` command.
- Documented `vfs://org/...` as a first-class scheme, with
  `vfs://tenant/...` retained as the legacy alias.
- Corrected the session-start failure behavior: unresolved includes now
  start the session in a degraded state with an
  `<expert-prompt-include-warning>` block instead of refusing to start;
  apply/`validate` linting remains strict.

## v1.9.1 — 2026-06-01

### Deep Code Reviewer deletes its "Started" session-link comment when posting the review

- Reworked Step 5 of `expert-templates/prompts/deep-code-reviewer.md` to
  explicitly delete the "Started — view session" comment (posted in Step 0
  by `post-eyes-reaction`) immediately after the review is posted, so it no
  longer lingers on the PR alongside the review. Deletion mechanics still
  live in the shared `clear-eyes-reaction` skill; this change only binds the
  cleanup to the review-posting step and reinforces that it runs on every
  exit branch. Scoped to the Deep Code Reviewer prompt — the shared skills
  and the End-to-End Verifier are unchanged.
- Bumped `manifest.yaml` version to `1.9.1`.

## v1.9.0 — 2026-05-31

### Nightly audit: Spaces/Residents availability, tags removal, trigger rate cap

- `experts.md`: removed the stale `tags` bundle field and "Managing Tags
  (CLI)" section — the field and `auggie cloud tag` commands no longer exist
  in the CLI or proto (`reserved "tag_ids"`). Clarified the `model` field
  example (the bundle accepts either the family key `claude-opus-4-7` or the
  short key `opus4.7` shown by `auggie model list`). Added the
  dev/staging-only Availability blockquote to "Managing Spaces" and a
  `(dev/staging-only)` marker on the `space` field.
- `residents.md`, `guides/cloud/README.md`, `manifest.yaml`: removed the
  internal feature-flag name from prose and set the disabled-everywhere
  availability wording (`> Availability: This feature is not enabled anywhere
  right now.` on the topic article; `(not yet available)` in the routing
  row), matching the current flag state.
- `environments.md`: added a `(dev/staging-only)` marker to the Spaces
  section and dropped the stale comparison to tags.
- `vfs.md`, `guides/cloud/README.md`, `manifest.yaml`: documented the
  `space/` VFS scope with a `(dev/staging-only)` marker, mirrored into the
  README routing row and the manifest sibling description.
- `automations.md`: documented the per-trigger `perMinuteCreateAgentLimit`
  field.
- `capabilities.md`: noted that the `ECHO` builtin capability is a test-only
  tool that should not be added to production experts.

## v1.8.15 — 2026-05-27

### Slack subscribe-and-respond: remove `:eyes:` after the reply posts (AU-21698)

- `skills/slack/subscribe-and-respond.md` Respond branch now calls
  `reactions.remove(name: "eyes", timestamp: <event.ts>)` after the response
  `chat.postMessage` returns, so the channel can distinguish "still working"
  from "done answering". Without this step, stale `:eyes:` accumulated on
  every reply the bot answered. Errors on remove are swallowed (already
  removed, missing, etc.). Frontmatter and `manifest.yaml` descriptions
  updated to mention the removal.

AU-21698.

## v1.8.14 — 2026-05-26

### Feedback Triager (Slack): guard reactive-mode dispatch

- Clarified that the template's customer-owned Classify and Act sections are
  dispatch targets only. Initial `reactive` triage still classifies enough to
  post the summary reply, but must not continue into ticket filing until an
  event-loop clause `a` / `e` explicit file-ticket ask dispatches the Act
  section.

## v1.8.9 — 2026-05-22

### Feedback Triager: remove owner inference from ticket filing (AU-21677)

- Removed the Feedback Triager's owner-candidate inference path entirely. Step 4 no longer asks the bot to identify an owner, write an `Owner candidate:` line, set a downstream assignee, or read owner-hint configuration before filing. Deleted `skills/slack/feedback-triager/owner-candidate-inference.md`, removed the `<OWNERSHIP_HINTS>` bundle context, and dropped the owner-attribution memory class so filed tickets enter the normal human triage queue without agent-supplied ownership guesses.

AU-21677.

## v1.8.8 — 2026-05-14

### Deep Code Reviewer: refine dedup policy (AU-21367)

- Split the dedup rule out of the shared `skills/github/scan-existing-comments.md` (and its GitLab parallel) into a new integration-neutral `skills/code-review/dedup-policy.md`, included from `expert-templates/prompts/deep-code-reviewer.md` Step 2 (and reusable by future GitLab code-review experts). Other bots' general comments may now be duplicated when the code-review agent independently identifies a real issue; prior REVIEWS (own past runs, human reviewer comments) still must not be.

AU-21367.

## v1.8.5 — 2026-05-13

### Slack feedback triage Fixer mode: drop the draft-PR milestone (AU-20471)

- PR Author now opens PRs as ready-for-review (no separate draft milestone), so the Fixer-mode milestone contract collapses from three milestones to two: `PR/MR opened (ready for review)` and `Ready to merge`. Updated `skills/slack/feedback-triage/fixer-mode.md` (frontmatter description + `milestone_list`), the matching `manifest.yaml` description, and the `slack-feedback-triage.yaml.template` onboarding-header summary.
- `skills/slack/feedback-triage/event-loop.md` clause `c` cleanup line generalized from "draft PR/MR" to "PR/MR" since the worker no longer opens drafts.

AU-20471.

## v1.8.4 — 2026-05-13

### Slack feedback triage: drop redundant `posting-messages` skill (AU-20471)

- Deleted `skills/slack/posting-messages.md` and removed the corresponding `<include>` directives from `skills/slack/feedback-triage/event-loop.md` and `expert-templates/prompts/slack-feedback-triage.md`. The `text` vs `blocks` payload-structure rule it codified now lives in `skills/slack/mrkdwn-formatting.md` on `main` (#53833), so the separate skill is redundant.
- Removed the matching `manifest.yaml` entry.

AU-20471.

## v1.8.3 — 2026-05-13

### Slack feedback triage Fixer mode: drop redundant policy placeholders + prose-reference cleanup (AU-20471)

- Removed the `<MERGE_POLICY>`, `<VERIFICATION_POLICY>`, and `<TASK_SIZE_POLICY>` placeholders from the Slack feedback-triage Fixer-mode hand-off. The launched PR Author worker already defaults to notify-only on merge and adaptive verification, so passing redundant policy lines into the worker message added configuration burden on adopting bundles without changing behavior. Bundles that genuinely need to override any of these now fork the `fixer-mode` skill and add the lines directly to the worker message there.
- Replaced explicit `kb://...` paths in prose (template onboarding header, manifest descriptions, `fixer-mode` skill description) with bare skill names (e.g. "the shared `fix-via-pr-author` skill") so the wording survives if the underlying file moves. `<include src="kb://..." />` directives are unaffected — they must keep the URI.
- Tightened the frontmatter `description` lines on the `lifecycle`, `event-loop`, and `fixer-mode` skills (and the matching `manifest.yaml` entries) — the per-step / per-clause implementation detail belonged in the body, not the description, and the long descriptions ballooned the rendered `<skill-ref>` blurbs that lazy-includes emit.

AU-20471.

## v1.8.2 — 2026-05-13

### Slack feedback triage: research pass, clarifying questions, owner inference, Fixer mode (AU-20471)

Single comprehensive landing of the AU-20471 Slack feedback-triage upgrades that previously sat as a stack of v1.7.9–v1.7.12 drafts on the PR branch, restructured per review feedback to drop Investigate mode and reuse the shared Slack skills promoted on main in v1.7.14.

- **Step 1.5 in-thread ack** — a single short `:mag: investigating` reply posted once the bot owns the thread, so the poster knows the bot picked the message up. Hardcoded in the lifecycle skill (no per-bundle placeholder).
- **Step 2.5 research pass + information-sufficiency check** — up to 3 codebase / knowledgebase / web searches to answer simple questions from the codebase (settling the thread without filing a ticket) before classifying. When the message could plausibly land in two buckets and the disambiguator isn't in the thread, ask one focused clarifying question via the existing `:thinking_face:` / `clarification_asked` machinery.
- **Owner-candidate inference on every filed ticket** — the Step 4 ticket action contract now requires an `Owner candidate:` line at the top of the ticket description, resolved from a new `<OWNERSHIP_HINTS>` block in the bundle context and codebase signals (CODEOWNERS, recent `git blame`, README owners sections).
- **Fixer mode** — explicit human ask in the thread (event-loop clause `f`) dispatches into the fixer-mode skill, which composes the shared `fix-via-pr-author` skill to launch a configured PR Author (GitHub) or MR Author (GitLab) worker via the agent's `worker-launch` tool. Inert when `<PR_AUTHOR_EXPERT_ID>` is left as the literal placeholder.
- **Reply-style invariants + sign-off before terminating** — lifecycle skill now codifies: only reply on a direct question or required triage action, no @-mentions, 2-4 line triage confirmations, and compose the shared `slack/announce-before-terminating.md` skill before any `terminate-session` call when the session has already posted in the thread.
- **Event-loop root-withdrawal cleanup** — clause `c` now terminates any previously-launched PR/MR Author worker via `worker-terminate` (replacing the prior cross-session `auggie cloud session connect` invocation) and announces the cancellation in the Slack thread.
- **Bucket-ambiguity in Step 2.5 Section B** — sufficiency criterion now gates on whether the consumer's Classify taxonomy can pick a single bucket with confidence in addition to ticket-detail completeness.

Removed from the originally drafted change set per review:

- **Investigate mode** is not part of this landing. The mode and its `<INVESTIGATOR_EXPERT_ID>` placeholder, dedicated `investigate-mode.md` skill, and lifecycle dispatch are gone.
- **`<INVESTIGATING_ACK>`, `<SIGNOFF_MESSAGE>` placeholders** removed — both are now hardcoded in the lifecycle skill / supplied by the shared end-of-watch skill.
- **Builder naming** renamed to **PR/MR Author** end-to-end (`<BUILDER_EXPERT_ID>` → `<PR_AUTHOR_EXPERT_ID>`, `builder_session_url` → `pr_author_session_url`, etc.).
- **`auggie cloud session create` / `auggie cloud session connect`** invocations replaced with the agent's `worker-launch` and `worker-terminate` tools. `CLI_TOOLS` is no longer required as a capability on the bundle.

AU-20471.

## v1.8.1 — 2026-05-13

### Ack follow-up replies with `:eyes:` in Slack subscribe-and-respond

- `skills/slack/subscribe-and-respond.md` Respond branch now adds a
  `:eyes:` reaction to the incoming reply before any other work, so
  users can tell the agent picked up the follow-up. Bumped
  `manifest.yaml` to `1.8.1`.

## v1.7.14 — 2026-05-11

### Promote `subscribe-and-respond` and `fix-via-pr-author` to shared Slack skills

- Moved `skills/slack/alert-investigator/subscribe-and-respond.md` and
  `skills/slack/alert-investigator/fix-via-pr-author.md` up to
  `skills/slack/` and rewrote the bodies to drop alert-investigator-only
  framing (incident / phase numbers / confidence × severity rubric / "on-call"
  language) so any Slack-posting expert that needs the same flows can
  `<include>` them directly.
- Folded the alert-investigator-specific eligibility constraint
  (Confirmed; or High + P1/P2; never Tentative or P3/P4) into the
  `fix via PR` recommended-action bullet of
  `skills/slack/alert-investigator/post-structure.md`, where the tag is
  defined.
- `expert-templates/prompts/slack-alert-investigator.md` now wraps each
  shared skill with one short framing line (Phase 3.5 timing + the
  session-link footer reference; Phase 4 not-resolved-yet rule) and
  `<include>`s the new top-level paths. The expert behaviour is unchanged.
- Split the original `fix-via-pr-author` skill so the
  numbered-options "wait for human selection" gate (which is tied to
  the alert-investigator's *Possible fixes* layout and the `fix via
  PR` recommended-action tag) lives in
  `skills/slack/alert-investigator/await-fix-selection.md`, and the
  shared `skills/slack/fix-via-pr-author.md` only owns the generic
  worker-launch + follow-along handoff. Phase 4 of the
  alert-investigator prompt now `<include>`s both, in that order.
- Updated `manifest.yaml`, `expert-templates/slack-alert-investigator.yaml.template`,
  and the alert-investigator prompt to point at the new locations and
  bumped the manifest to `1.7.14`.

## v1.7.8 — 2026-05-07

### Post a "view session" comment alongside the 👀 reaction

- Extended `skills/github/post-eyes-reaction.md` to post a short top-level
  PR comment linking back to the agent's session right after the `eyes`
  reaction, so PR authors can watch progress in real time. Silently
  skipped when `session_url` is missing from `session-metadata.md`.
- Mirrored cleanup in `skills/github/clear-eyes-reaction.md`: delete the
  recorded comment on every exit branch alongside the reaction.
- Bumped `manifest.yaml` version to `1.7.8`. New behavior automatically
  flows to every expert that already includes `post-eyes-reaction.md`.

## v1.7.7 — 2026-05-07

### Advisor auto-deploys Code Review Memory Manager with the code-review fleet

- `advisor/playbook.md` chooser-label table: Deep Code Reviewer,
  Intent Reviewer, and PR Risk Analyzer rows now also deploy
  `code-review-memory-manager.yaml.template` (if not already deployed)
  so the code-review fleet starts learning from PR feedback from day
  one. Memory Manager is hidden and idempotent — deployed once
  regardless of how many code-review experts are in the picks.
- Updated the Memory Manager catalog entry from "optional companion …
  Not in the chooser; surface only if the user asks" to reflect that
  it is now auto-deployed alongside any code-review pick.
- `expert-templates/prompts/advisor.md` test-and-arm rule (auto
  variant): added a fourth specific telling Advisor to deploy
  `code-review-memory-manager.yaml.template` once (with
  `spec.triggers: []`) before the try-it menu when any code-review
  expert is in the picks, since Memory Manager isn't a chooser
  checkbox and is not pre-created by the auto flow. Its trigger is
  armed in the bulk arm-triggers step alongside the other
  code-review experts.

## v1.7.6 — 2026-05-05

### Silence VFS-conflict narration on agent-owned memory files

- New leaf skill `skills/memory/internal-vfs-conflict-handling.md`
  telling interactive experts (Own Reviewer, Intent Reviewer, Advisor,
  Personal Assistant, and any other expert that pulls in the memory
  skills) to recover silently from `[VFS conflict]` system
  notifications on their own breadcrumb / curated-knowledge files —
  no `## VFS Conflict Resolved` heading, no backup-path or file-path
  mention, no `📝 Remembered: …` heads-up replay — and re-apply the
  lost write against the latest server version.
- Included from `skills/memory/feedback-capture.md`,
  `skills/memory/curate-knowledge.md`, and
  `skills/memory/prune-and-compact.md` so every interactive expert
  composing those skills picks up the rule.
- Bumped `manifest.yaml` version to `1.7.6`.

## v1.7.5 — 2026-05-04

### Trim and consolidate: automations docs, templates table, dead README

- Merged `guides/setting-up-automations.md` into `guides/cloud/automations.md`
  as new `Setup Walkthrough` and `Worked Examples` sections, then deleted the
  walkthrough file. The walkthrough separates one-time `Prerequisites`
  (expert bundle exists, integration connected, capability matches) from the
  numbered trigger-specific `Steps` (capture event → write filter → add
  trigger → re-apply and verify). The reference doc is now the single home
  for trigger and subscription content. Repointed all inbound links in
  `README.md`, `guides/webapp.md`, and `manifest.yaml`.
- Tightened `guides/cloud/automations.md § autoCleanupOnIdle` from 14 lines to
  a 7-line summary — dropped the proto field number, the schema file path,
  and the snake_case-vs-camelCase round-trip detail (internal-implementation
  notes, not agent-facing). Heading text preserved so the existing
  `README.md` anchor reference still resolves.
- Tightened the `expert-templates/README.md` Templates table: every "What It
  Does" cell is now a single short sentence describing user-visible behavior.
  Detailed mechanics already live in each template's own system prompt and in
  the relevant guide pages.
- Removed `skills/README.md` (zero inbound references; it pointed at a
  monorepo design doc that isn't in the synced kb).
- Bumped `manifest.yaml` version to `1.7.5`.

## v1.7.4 — 2026-05-04

### Add Ticket Dispatcher expert template

- New `expert-templates/ticket-dispatcher.yaml.template` and matching
  shared system-prompt body at `expert-templates/prompts/ticket-dispatcher.md`.
  Scheduled triage agent that runs every 3 hours, scans configured
  GitHub repos and Linear teams (newest-first) for open tickets,
  applies a single judgement-based rubric, and either dispatches the
  `PR Author (GitHub)` expert as a worker (Path A) or skips the
  ticket (Path B). Per-ticket triage state lives in three labels
  (`cosmos-dispatched`, `cosmos-skipped`, `cosmos-dispatch-failed`).
  Per-PR state lives in VFS under `PR_REGISTRY_PATH` (one YAML file
  per dispatcher-owned PR) so the dispatcher can cap concurrent open
  PRs at `MAX_OPEN_PRS` (default 10) for backpressure and auto-close
  PRs idle for `STALE_PR_DAYS` (default 7). Comments are reserved for
  the rare Path-A failure and the stale-PR close. PR Author workers
  are instructed to open PRs as **Ready for Review**, not draft.
- New skill set under `skills/ticket-dispatcher/` (`dispatch-rubric.md`,
  `scan-loop.md`, `github-source.md`, `linear-source.md`) backing the
  template. `github-source.md` adds `read-pr-status`,
  `read-pr-activity`, and `close-stale-pr` primitives for the VFS PR
  registry refresh and stale sweep.
- Updated `expert-templates/README.md` with the new template row and
  the `<PR_AUTHOR_EXPERT_ID>` / `<GITHUB_USERNAME>` / `<GITHUB_REPOS>`
  / `<LINEAR_TEAM_KEYS>` / `MAX_OPEN_PRS` / `STALE_PR_DAYS` /
  `PR_REGISTRY_PATH` placeholder rows.

## v1.7.3 — 2026-05-02

### Nightly audit: environment OLAC rollout, daemon flags, environment.type, cosmos alias

- Updated `guides/secrets-and-access.md`, `README.md`, and `manifest.yaml`
  to reflect that environment OLAC is now unconditionally enabled
  (PR #52774). The `poseidon_environment_olac_enabled` flag has been removed.
- Refreshed the `auggie daemon` flag list in `guides/compute-models.md`
  to include `-n`, `--vm-id`, `--new-vm-id`, and `--pool-id` (matches
  `clients/cli/src/cli/commands/daemon/index.ts`).
- Rewrote the "Pinning an Expert to a Daemon" section in
  `guides/compute-models.md` as "Pinning an Expert to a Daemon or Pool"
  to document the `spec.expert.environment.type` field
  (`base_image` | `pool` | `daemon`) defined by the CLI bundle schema.
  Marked `spec.expert.daemonVmId` as a legacy alias and pointed at
  `services/poseidon/specs/expert-bundle-yaml-v2.md` for the proto
  mapping. Updated the matching `README.md` dispatch row.
- Added a brief note in `guides/cloud/self-service.md` documenting the
  `cosmos` top-level alias for the `auggie cloud` command group
  (PR #52792).
- Bumped `manifest.yaml` version to `1.7.3`.

## v1.7.2 — 2026-05-03

### Typed custom webhooks (`auggie cloud webhook` CLI) and `session list --include-shared`

- **Type 1 fix.** `expert-templates/README.md` § Trigger Fields claimed
  "there is no `auggie cloud webhook` CLI subcommand". PR #52498 ("[Builder]
  Typed custom webhooks (GitLab + Jira)", merged 2026-05-02) added that
  subcommand. Rewrote the `webhookId` row to point at the new CLI surface and
  the new `guides/cloud/automations.md` § Custom Webhooks section.
- **Type 2 fix.** Documented the new `WebhookType` enum (`bearer`, `gitlab`,
  `jira`) and the `auggie cloud webhook create / list / show / instructions /
  delete` subcommands in `guides/cloud/automations.md` § Custom Webhooks, with
  a YAML example wiring a typed webhook to a `webhook` trigger. Added a
  matching dispatch row to `README.md`.
- **Type 2 fix.** PR #52789 ("fix(cli): default 'cloud sessions list' to
  current user only") changed the default behavior of
  `auggie cloud session list` and added `--include-shared` / `--limit`. Added
  a § Listing Sessions From the CLI section to `guides/cloud/sessions.md`
  documenting the new defaults and flags, plus a `README.md` dispatch row.
- Bumped `manifest.yaml` version to `1.7.2`.

## v1.7.1 — 2026-05-02

### Added the Personal Assistant expert template

- New `expert-templates/personal-assistant.yaml.template` with the prompt body
  at `expert-templates/prompts/personal-assistant.md`, mirroring the deployed
  Personal Assistant expert (persistent task tracker in user-scoped VFS,
  cross-session memory, opt-in Slack DMs, dispatches any deployed expert as a
  worker via `useAllExpertsAsWorkers: true`). Memory skills are bound to
  `TEAM=personal-assistant` / `SCOPE=global` with paths overridden from tenant
  scope to user scope.
- Added a row to `expert-templates/README.md` and registered both files in
  `manifest.yaml`.
- Not added to `clients/web/app/src/lib/client-cache/experts/default-expert-seeds.ts`;
  new tenants are not auto-seeded with this expert. Apply manually via
  `auggie cloud expert apply -f expert-templates/personal-assistant.yaml.template`
  (after substituting `<ENVIRONMENT_ID>`).

## v1.7.0 — 2026-05-02

### Fold Expert Factory into Advisor

- Retired the standalone Expert Factory expert. New tenants now seed only
  Advisor; Advisor handles bespoke expert design and creation inline.
- Added `skills/cosmos/build-expert.md` — a conversational, Advisor-voice
  build-and-create flow that drives requirements via `ask-user` (trigger,
  identity, capabilities, output destination), constructs an `ExpertBundle`
  internally, gates on an explicit go, applies via `auggie cloud expert apply
  -f`, and reports back with a launch deep-link. Never shows YAML to the user.
- `expert-templates/prompts/advisor.md` lazy-includes the new skill and
  recommends a catalog template when one fits, switching into the build-expert
  flow when none does. `advisor/playbook.md` Phase 3 catalog gains a "Bespoke
  expert" entry; the "Not yet deployable" line drops the bespoke-agents bullet.
- `expert-templates/prompts/expert-factory.md` is now a one-line redirect
  stub (`<include src="kb://skills/cosmos/build-expert.md" />`) so already-
  deployed Expert Factory experts pick up the new behavior on next session
  without a redeploy.
- Deleted `expert-templates/expert-factory.yaml.template` and dropped the
  Expert Factory row from `expert-templates/README.md`.
- Web app default seeds (`clients/web/app/src/lib/client-cache/experts/
  default-expert-seeds.ts`) no longer include Expert Factory; tests and the
  `default-experts-seeding.md` spec updated to match.


## v1.6.0 — 2026-05-01

### Cosmos audit: CLI, webapp, expert, VFS, and memory docs

- Updated CLI docs for `autoCleanupOnIdle`, `auggie cloud trigger list/get/delete`,
  `auggie cloud secret`, and environment default commands.
- Corrected webapp docs for the Configuration sidebar, `/secrets`, `/admin`,
  `/analytics`, `/my-settings` / **My Settings**, and the user-profile menu.
- Documented `spec.expert.hidden`, clarified that webhook IDs come from the
  webapp `/webhooks` page (no `auggie cloud webhook` command), and refreshed
  README dispatch rows for the new lookup paths.
- Finished the VFS `tenant` → `org` terminology pass in memory skills and
  guides while preserving `vfs://tenant/...` include-URI examples where the
  resolver still requires that scheme.
- Refreshed `manifest.yaml` descriptions and set the knowledgebase version to
  `1.6.0`.

## v1.5.10 — 2026-05-01

### Deep Code Reviewer always re-reviews (drop "already reviewed" guard)

- Removed the "If you find a review you already posted, do not post a duplicate" stop-and-report line from `expert-templates/prompts/deep-code-reviewer.md`, and dropped the matching `Self-detect prior runs` bullet from `skills/github/scan-existing-comments.md` (the included skill was reasserting the same guard). Deep Code Reviewer now always proceeds to post a fresh review when re-run on the same PR. The `kb://skills/github/self-detection.md` include is preserved for distinguishing other agents' and humans' comments. Bumped `manifest.yaml` version to `1.5.10`.

## v1.5.9 — 2026-05-01

### Code-review memory: drop the global-knowledge concept; per-scope prune-and-compact

- Dropped the global-knowledge concept across the generic memory skills. `skills/memory/load-memory.md` now reads exactly one `knowledge/{SCOPE}.md` (no separate "team global" read step). `skills/memory/knowledge-file-shapes.md` documents one shape — bullets grouped under `##` matcher headings (file-path globs for repo-bound teams, topic names for single-scope teams) — instead of a per-scope shape and a separate global shape. `skills/memory/curate-knowledge.md` no longer mentions `knowledge/global.md`.
- Scoped `skills/memory/prune-and-compact.md` to one knowledge file. The skill used to walk every curated knowledge Markdown file under `experts/{TEAM}/knowledge/`; it now takes a `{SCOPE}` parameter and operates on `knowledge/{SCOPE}.md` only. This closes a hole in the per-scope Memory Manager run where prune-and-compact could touch unrelated repos. Updated `skills/code-review/prune-and-compact.md` to bind `{SCOPE} = {owner}/{repo}`.
- Trimmed the read-back retry section in `expert-templates/prompts/code-review-memory-manager.md` to the essential idea (re-read after appending, retry once or twice if the write was clobbered, skip Step 6b on persistent races) without spelling out attempt counts or backoff timing — the agent doesn't need that granularity.
- Updated `expert-templates/prompts/code-review-memory-manager.md` Ground Rule 1 to drop the `knowledge/global.md` reference (no global concept anymore).
- Removed the `code-review` legacy `knowledge/global.md` from the org VFS (`/root/.augment/vfs/AGENT_ID/org/experts/code-review/knowledge/global.md`). The file's `## Conventions` items had already been migrated into per-repo cross-cutting bullets via earlier breadcrumb sections; the `## Reviewer style` aggregation is no longer maintained.
- Refreshed `skills/code-review/load-memory.md` and `skills/code-review/knowledge-file-shapes.md` to drop the "no `knowledge/global.md`" caveats (no longer needed since the generic skill never mentions global).
- Refreshed the layout tree, the Knowledge file format section, the Knowledge Curation paragraph, and the `code-review` example in `guides/cloud/expert-memory.md` to describe one per-scope shape only. Refreshed `manifest.yaml` descriptions for `skills/memory/load-memory.md`, `skills/memory/knowledge-file-shapes.md`, `skills/memory/curate-knowledge.md`, `skills/memory/prune-and-compact.md`, and the four `skills/code-review/*` bindings.
- Bumped `manifest.yaml` version to `1.5.9`.

## v1.5.8 — 2026-04-30

### Code-review memory: rename Data Collector → Memory Manager

- Renamed `code-review-data-collector` → `code-review-memory-manager`. The new bundle name is `code-review-memory-manager`; display name is **Code Review Memory Manager**. The rename reflects that this expert now owns the team's per-repo memory end-to-end (since the Memory Curator was dropped in v1.5.7) — it both appends the post-merge breadcrumb and rewrites the curated knowledge file.
- File layout is unchanged from v1.5.7: per-repo `breadcrumbs/{owner}/{repo}.md` (append-only) + `knowledge/{owner}/{repo}.md` (single whole-file rewrite from current breadcrumbs via `curate-knowledge`).
- Adopter migration: apply the new `code-review-memory-manager.yaml.template` bundle, then run `auggie cloud expert delete code-review-data-collector` (or delete from the webapp) to remove the old bundle. The previous bundle name is now orphaned. No on-disk format changes.
- Refreshed naming references in `guides/cloud/expert-memory.md`, `expert-templates/README.md`, `manifest.yaml`, and `skills/memory/feedback-capture.md` to use **Memory Manager** instead of **Data Collector**. Bumped `manifest.yaml` version to `1.5.8`.

## v1.5.7 — 2026-04-30

### Code-review memory: drop the Memory Curator expert

- Removed the `code-review-memory-curator` expert template and its system-prompt body (`expert-templates/code-review-memory-curator.yaml.template`, `expert-templates/prompts/code-review-memory-curator.md`).
- Moved per-repo curation into the Code Review Data Collector. Each PR-close run now (a) appends the PR-summary section to `breadcrumbs/{owner}/{repo}.md` with read-back retry against concurrent-collector clobbers, then (b) rewrites `knowledge/{owner}/{repo}.md` from the current breadcrumb set via the shared `skills/memory/curate-knowledge.md` skill as a single whole-file rewrite. No locking — the rare 1/11 probabilistic compaction over 50 KiB+ files plus the deterministic per-scope rewrite make explicit coordination unnecessary.
- Simplified `skills/memory/curate-knowledge.md` to operate **per scope only**. It now reads exactly one `breadcrumbs/{SCOPE}.md` and rewrites exactly one `knowledge/{SCOPE}.md`. The previous cross-scope curator behavior (listing every breadcrumb file under the team root, writing `knowledge/global.md`, the `≥-3-scope` global-promotion rule) had no remaining caller in this knowledgebase after the curator was dropped, so it has been removed; the skill is no longer parameterized.
- Dropped the code-review team's cross-repo `knowledge/global.md` and the `## Reviewer style` aggregation. The legacy file (if present from earlier curator runs) is no longer read or refreshed by `code-review` reviewers; it can be deleted manually if desired but is harmless. Updated `skills/code-review/load-memory.md` and `skills/code-review/knowledge-file-shapes.md` accordingly, and removed `skills/code-review/curate-knowledge.md` (the team-specific binding for the curate skill is no longer needed — the Data Collector includes the generic skill directly).
- Refreshed the Knowledge Curation section and the `code-review` example in `guides/cloud/expert-memory.md` for the per-scope-only model.
- Updated `expert-templates/README.md` and `manifest.yaml` to drop the curator entry and rewrite the Data Collector entry to reflect its new curation responsibility.
- Bumped `manifest.yaml` version to `1.5.7`.

## v1.5.6 — 2026-04-30

### Code review expert renames

- Renamed **Bug Reviewer (Single Model)** → **Deep Code Reviewer** and **Co-Reviewer (GitHub)** → **Intent Reviewer (GitHub)** to make the interaction model the primary distinction. Deep Code Reviewer is **non-interactive** (no human-in-the-loop, posts inline comments directly); Intent Reviewer is **interactive** (agent leads each phase and consults the human between phases for intent, history, and judgment).
- Renamed `expert-templates/bug-reviewer.yaml.template` → `deep-code-reviewer.yaml.template`, `expert-templates/co-reviewer.yaml.template` → `intent-reviewer.yaml.template`, and the matching `expert-templates/prompts/*.md` bodies.
- Updated bundle metadata names (`bug-reviewer-single-model` → `deep-code-reviewer-single-model`, `co-reviewer-github` → `intent-reviewer-github`), display names, descriptions, and `userInstructions` to call out the interactive vs non-interactive contract. The `Bug Review Agent` role label in the deep-reviewer prompt is now `Deep Code Review Agent`.
- Renamed the `<CO_REVIEWER_EXPERT_ID>` placeholder and the `# Co-Reviewer handoff configuration` section in `pr-risk-analyzer.yaml.template` to `<INTENT_REVIEWER_EXPERT_ID>` / `# Intent Reviewer handoff configuration`. The shared PR Risk Analyzer prompt now builds focused- and general-review URLs against the Intent Reviewer expert ID.
- Refreshed cross-references in `expert-templates/README.md`, `manifest.yaml`, the Code Review Data Collector and Memory Curator prompts, the memory and code-review skills (`feedback-capture.md`, `pr-collection-idempotency.md`), and the guides (`writing-expert-prompts.md`, `self-service.md`, `expert-memory.md`, `vfs.md`, `setting-up-automations.md`).
- Bumped `manifest.yaml` version to `1.5.6`.

## v1.5.5 — 2026-04-30

### PR Author — surface the PR URL and soften the robotic tone

- The end-of-turn message after PR creation / monitor initialization now **always** includes the PR's `html_url` instead of the bare "Initialization complete." string. The link is the most useful piece of information the human reader gets from that message.
- The termination message (PR closed / merged) also includes the PR URL once.
- Relaxed `skills/hygiene/short-assistant-messages.md` from "single short sentence" to "one or two short, human-friendly sentences" — same anti-narration / anti-input-echoing constraints, but no longer artificially terse. Comment-answering and CI/conflict follow-ups got friendlier example sentences (without re-pasting the PR URL on every event).
- Bumped `manifest.yaml` version to `1.5.5`.

### Files

- Updated: `skills/github/pr-monitor/init.md`, `skills/github/pr-monitor/termination.md`, `skills/github/pr-monitor/comment-answering.md`, `skills/github/pr-monitor/ci-and-conflict-handling.md`, `skills/hygiene/short-assistant-messages.md`, `manifest.yaml`


## v1.5.4 — 2026-04-29

### Advisor memory

- Updated the Advisor prompt and playbook to use `experts/advisor/breadcrumbs/global.md` as the only Advisor memory source, then auto-capture durable Advisor learnings through the shared `skills/memory/feedback-capture.md` flow.

### Cosmos rebrand

- Renamed the product from "Augment Cloud" / "Augment Cloud Agents" to **Cosmos** across the knowledgebase: README, guides, expert templates, advisor playbook, and manifest descriptions. "Cloud agent(s)" → "Cosmos agent(s)"; "Augment Cloud Knowledgebase/Guide/Webapp Guide" → "Cosmos Knowledgebase/Guide/Webapp Guide".
- Preserved technical surfaces unchanged: `auggie cloud …` CLI commands, the `Poseidon` backend codename, the `augment-cloud/session-metadata.md` virtual rule path, `~/.augment/…` paths, `guides/cloud/` directory layout, and the `cloud_agent` / `CLOUD_AGENT` enum values exposed in proto and bundle schemas.
- Bumped `manifest.yaml` version to `1.5.4`.

## v1.5.3 — 2026-04-29

### Expert Factory prompt extraction

- Added `expert-templates/expert-factory.yaml.template`, moved the seeded Expert Factory system prompt body into `expert-templates/prompts/expert-factory.md`, and replaced the web app seed with a shared `<include>` reference.
- Bumped `manifest.yaml` version to `1.5.3`.

## v1.5.2 — 2026-04-28

### Codebase audit — session workspace redesign, top-level Files VFS pages, worker archive cascade, `session create --message`, environment OLAC sharing

- Rewrote the Session Detail section in `guides/webapp.md` for the new workspace-shell layout (pinned Agent / Terminal / Files / Changes / Subscriptions tabs + Details right rail).
- Documented the standalone `/vfs/<scope>` Organization and User Files pages and added a top-level `Files` sidebar group.
- Updated `guides/cloud/workers.md` to describe the new platform-owned archive/delete cascade through descendant workers.
- Added a `Creating Sessions From the CLI` section to `guides/cloud/sessions.md` covering the `--message` flag on `auggie cloud session create`.
- Added an `Environment Access Control` subsection to `guides/secrets-and-access.md` for per-recipient OLAC sharing of environments.
- Corrected `guides/secrets-and-access.md` and `guides/cloud/sessions.md` to reflect that per-recipient expert sharing UI (Share expert button via `ShareExpertDialog`) is shipped through the generic OLAC RPCs, while no dedicated `ShareExpert` RPC or CLI exists yet.
- Refreshed `README.md` dispatch rows and `manifest.yaml` descriptions for the touched pages; bumped version to `1.5.2`.

## v1.5.1 — 2026-04-27

### Codebase audit — webapp sidebar rename, home page Shared toggle, custom webhooks page

- Renamed the `Settings` sidebar group to `Configuration` in `guides/webapp.md` and updated the documented item order.
- Corrected the `/home` Visibility control description: it is a single **Shared** toggle, on by default.
- Documented the flag-gated `/webhooks` page in `guides/webapp.md`.
- Bumped the documented `Recent sessions` cap to 30 to match `MAX_SIDEBAR_CHATS`.

### Codebase audit — MCP backend registry, expert apply `--prune`, composable-skill `<include>` directives, per-trigger auto-archive override, shared-expert MCP scope rule, expert OLAC enforcement state (rolled in from 2026-04-26)

- Rewrote the MCP section in `guides/compute-models.md` to cover the backend MCP registry, the `auggie cloud mcp` subcommands, per-expert MCP pinning, and the shared-expert / shared-MCP scope rule.
- Updated `guides/secrets-and-access.md` to reflect MCP backend storage and the shipped backend expert OLAC interceptor.
- Documented `--prune` for `auggie cloud expert apply` and the trigger-reconcile semantics in `guides/cloud/experts.md`.
- Added a composable-skills section to `guides/cloud/writing-expert-prompts.md` covering `<include>` directives, `inline` / `lazy` modes, and cycle/depth limits.
- Documented per-trigger `auto_cleanup_on_idle` override in `guides/cloud/automations.md` and `guides/webapp.md` (webapp YAML/UI only; not yet in the CLI schema).
- Updated `guides/cloud/sessions.md` to reflect backend expert OLAC shipped.
- Routed the new topics in the `README.md` dispatch table.

### Manifest

- Bumped `manifest.yaml` version to `1.5.1` and updated descriptions for the touched pages.

## v1.5.0

### Expert template prompt extraction

- Moved every expert template system prompt body into `expert-templates/prompts/`.
- Updated each `*.yaml.template` so `spec.expert.systemPrompt` starts with a shared `<include src="kb://expert-templates/prompts/<template-name>.md" />` reference.
- Kept customer-owned prompt customization inline in the two templates that need it: PR Risk Analyzer's repo/sensitive-path allowlist and Slack Feedback Triage's channel/taxonomy/ticket-action sections.
- Moved PR Risk Analyzer's tenant-specific Intent Reviewer handoff ID (then named "Co-Reviewer") out of the shared prompt; the prompt now derives the webapp origin from `session_url` at runtime.
- Updated `expert-templates/README.md` to document the customization contract.
- Bumped `manifest.yaml` version to `1.5.0` and added the prompts directory to the Expert Templates manifest section.

## v1.4.0

- Replaced the non-interactive Advisor Update agent with an interactive **Advisor**: collapsed `advisor/{README,advisor-agent-guide,agent-native-sdlc}.md` into a single `advisor/playbook.md`, replaced `expert-templates/advisor-update.yaml.template` with `expert-templates/advisor.yaml.template`, and updated `manifest.yaml` and `expert-templates/README.md` accordingly.

## v1.3.0

### New expert template: Slack Feedback Triage

- **Added `expert-templates/slack-feedback-triage.yaml.template`** — a complete `ExpertBundle` for a one-session-per-thread Slack feedback triage agent. Watches a single channel for new root messages, claims each one with a `:eyes:` reaction lock, opens one in-session `subscribe-event` that covers replies/edits/deletes/mentions, and routes recovery `app_mention`s back into the same session via Path B. Steps 0–3 of the system prompt (parse / claim / subscribe / event-loop dispatch) are supplied; classification and ticket creation are left as `<TODO>` markers for the adopting bundle. Channel ID, downstream ticket capability, `<TICKET_FILED_REPLY>`, and `<MARKER_COMMENT>` are placeholders. Extracted from the production `Poseidon Feedback Triage` expert (`e310dee2-ec93-4905-8447-8d9bc7253fab`) after a duplicate-ticket race (AU-20218/19, AU-20239/40, AU-20263/64) caused by triggering a new session on `message_changed` events.
- The `new-feedback-root` trigger filter constrains `event.type == "message"` (in addition to channel + no `thread_ts` + subtype absent or `file_share`) so root `app_mention` payloads cannot match it and re-introduce the duplicate-session race.
- The `app-mention-recovery` trigger filter constrains both `event.channel` and `event.type == "app_mention"` (the `event.type` clause is required because Slack also delivers app-mention events under the generic `message` event type).
- The bundle sets `autoCleanupOnIdle: false` on both trigger entries so that sessions are not auto-archived on idle. This keeps the in-session subscription alive for the lifetime of the thread — without it, the subscription is torn down on idle and the thread-lifetime contract silently breaks.
- A `# TODO: interaction with other Slack-based automations` block at the top of the file flags the open question of how the `:eyes:` claim lock and `app_mention` recovery should compose with Slackbot, other channel bots, and scheduled reminders before pointing this at a channel that already runs other Slack automations.

### Manifest

- Bumped `manifest.yaml` version to `1.3.0`.
- Added `expert-templates/slack-feedback-triage.yaml.template` to the **Expert Templates** section.

### README

- Routed the "set up Slack feedback triage" dispatch row to `expert-templates/slack-feedback-triage.yaml.template`.
- Added a corresponding row to `expert-templates/README.md`.

### Files

- Added: `expert-templates/slack-feedback-triage.yaml.template`.
- Updated: `README.md`, `manifest.yaml`, `expert-templates/README.md`.

## v1.2.0

### Codebase audit — capability list, trigger types, CLI flags

- **Removed `CLOUD_AGENT_CONTROL` from documented capabilities.** The capability is reserved in the Poseidon proto (no longer granted to experts). Dropped from `guides/cloud/capabilities.md`, `guides/operational-reference.md`, and `expert-templates/README.md`.
- **Added `pagerduty` trigger type.** Documented in `guides/cloud/automations.md`, `guides/setting-up-automations.md`, and `expert-templates/README.md` to match what the CLI trigger bundle parser accepts.
- **Corrected `pagerduty` trigger required field.** `pagerduty` bundle triggers require `pagerdutyRoutingKey` (not `eventType`) per `TriggerBundleSchema` in `clients/cli/src/cli/commands/cloud-agent/trigger/bundle.ts`. Updated the trigger tables in `guides/cloud/automations.md` and `expert-templates/README.md` to show `pagerdutyRoutingKey` and drop the bogus `eventType` examples.
- **Corrected runtime subscription source enum.** The runtime source for custom webhooks is `CUSTOM` (not `WEBHOOK`) per `ParseEventSource` in `services/poseidon/server/agents/tools/subscribe_event_tool.go`. `PAGERDUTY` is **not** exposed to `subscribe-event` — the `PAGERDUTY` capability registers the tool provider but is not plumbed into the tool's available-sources list (see `services/poseidon/server/agents/capability_tool_executor_provider.go`). Updated the subscription field shape table in `guides/cloud/automations.md` and added a note.
- **Corrected `event_type` requirement.** `event_type` is optional on runtime subscriptions (empty = match all); it is not required for `GITHUB`/`LINEAR`/`SLACK`.
- **Added the `enabled` trigger field** to the trigger field reference in `expert-templates/README.md` and the brief note in `automations.md`.
- **Fixed the `auggie cloud session create` example** in `guides/cloud/self-service.md`. The real CLI flags are `--expert <id>` and `--name <name>` — there is no `--expert-id` and no `--message` flag. Rewrote the example to show creating a session and either attaching via `auggie cloud session connect` or using a `/home?expertId=…&message=…` deep link for first-message tests.

### Manifest

- Bumped `manifest.yaml` version to `1.2.0`.
- Added missing entries to the Expert Templates section: `advisor-update.yaml.template`, `code-review-data-collector.yaml.template`, `code-review-memory-curator.yaml.template`.
- Added a new **Advisor** section listing `advisor/README.md`, `advisor/advisor-agent-guide.md`, and `advisor/agent-native-sdlc.md`.

### Files

- Updated: `guides/cloud/capabilities.md`, `guides/cloud/automations.md`, `guides/cloud/self-service.md`, `guides/setting-up-automations.md`, `guides/operational-reference.md`, `expert-templates/README.md`, `manifest.yaml`.

## v1.1.0

### PR Author expert — status poll worker & CI webhooks

- **Polling moved to a lightweight worker**: The 30-min health check is now handled by a separate Haiku 4.5 worker (`pr-status-poll-worker.yaml.template`) that only reports to the manager when action is needed. Routine checks are silent — no more context pollution.
- **Real-time CI failure detection**: CI failures are caught via SHA-specific `check_suite`/`status` webhooks instead of polling. Subscriptions rotate on each new push. The 30-min poll still checks CI as a fallback.
- **Bot review comments**: Substantive code review feedback from bots is no longer ignored — only pure status notifications are filtered out.
- **Direct message handling**: User messages in the session are now answered in-session instead of being posted as GitHub comments.

### Files

- Updated: `expert-templates/pr-author.yaml.template`, `expert-templates/README.md`, `manifest.yaml`
- Added: `expert-templates/pr-status-poll-worker.yaml.template`

## v1.0.0

Initial knowledgebase release. See [`README.md`](README.md) for the full
contents (guides + expert templates) and the "When to Consult This
Knowledgebase" dispatch table.

## 0.0.1-placeholder

- Initial knowledgebase infrastructure (placeholder content)
