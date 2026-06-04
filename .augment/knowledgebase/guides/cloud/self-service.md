# Self-Service Orchestration

The `auggie cloud` CLI is designed so that **agents can use it
themselves**. An agent reading this guide can create and update experts
(`auggie cloud expert apply`), configure environments
(`auggie cloud environment apply`), set up triggers inside expert
bundles, subscribe to events at runtime via `subscribe-event`, launch
workers from other experts via `worker-launch`, and manage sessions
(`auggie cloud session …`) — the same surface a human uses.

> `cosmos` is a top-level alias for the `auggie cloud` command group
> (e.g. `cosmos expert list` is equivalent to `auggie cloud expert list`).
> Both forms are accepted everywhere in this guide.

External integration setup is only partly self-service for agents. When the user
asks to set up an integration, link the web UI: `/integrations` for team
installs, or `/my-settings/integrations/github` /
`/my-settings/integrations/linear` for personal GitHub / Linear OAuth. A user or
admin must finish the browser OAuth / app-install flow.

When a user asks you to "set up a workflow that does X on every PR",
you don't need to walk them through the commands: apply the bundles
yourself and report back. The rest of this guide is written with that
in mind — every section describes a piece of the platform that you can
drive directly from within an agent session.

If you need to launch another expert from an agent, see
[Workers → Delegating to Another Expert](workers.md) for the two
options and how to choose.

## Where to Write Bundle Files

When you need to create or modify an expert bundle YAML file, **always
write it to `/tmp/`** (e.g., `/tmp/my-expert.yaml`). Bundle files are
transient — once applied, the expert lives server-side and the platform
does not read the local YAML at runtime. The file is only an input to
`apply` / `export` / `diff` workflows.

**Never** write bundles to any of these locations:
- `.augment/experts/` — the platform does not read experts from there
- `~/.augment/knowledgebase/` — reserved for reference documentation
- The user's workspace or repository — bundles are not source artifacts

## Always Apply — Never Leave Bundles Unapplied

After writing a bundle file, **always apply it immediately** with
`auggie cloud expert apply -f <file>`. Do not leave unapplied bundle
files for the user to deal with manually. The user asked you to set
something up — finish the job.

If you are unsure about a value (e.g., which environment ID to use, or
whether the expert should be user-scoped or tenant-scoped), **ask the
user first**, then apply once you have the answer. For things you can
verify yourself — such as trigger filters (use `auggie cloud event list`
to test them) — do so instead of asking. Do not write the file and tell
the user to fill in placeholders or run CLI commands themselves.

## Communicating with the User

When talking to the user, **use plain language** to describe what you
are doing. The user cares about the outcome, not the implementation
details.

**Do:**
- "I'm creating an expert that will review PRs automatically."
- "The automation is now live — it will trigger on every new PR."
- "I've updated the workflow to also post to Slack."

**Don't:**
- "I'm writing an ExpertBundle YAML with a `spec.triggers` block…"
- "Run `auggie cloud expert apply -f /tmp/pr-review.yaml` to deploy."
- "The bundle has been saved to `/tmp/pr-review.yaml`."

CLI commands, file paths, YAML structure, and terms like "bundle" or
"resource" are implementation details. Only mention them if the user
explicitly asks for technical details or wants to manage things
manually.


## Build and Test One Expert at a Time

When setting up a workflow that involves multiple experts (e.g., a
triager that links to a Pair Reviewer expert, or a PR author with a poll worker),
**build and verify each expert individually** before wiring them
together. Do not create all experts and triggers in a single pass —
problems are much harder to diagnose in a fully-assembled pipeline.

### The iterative loop

For each expert in the workflow:

1. **Write and apply the expert bundle.**
   ```
   auggie cloud expert apply -f /tmp/my-expert.yaml
   ```

2. **Invoke it manually.** Launch a test session from the expert and
   give it a realistic input. Confirm it behaves as expected before
   moving on.
   ```
   # From the CLI: creates a session and prints the agent ID. The
   # session starts empty — send the first message by attaching via
   # `auggie cloud session connect <id>` or from the webapp.
   auggie cloud session create --expert <id> [--name "Manual test"]
   ```
   For a one-shot test that includes a first message, the simplest
   path is a `/home` deep link the user can click:
   ```
   <base>/app/home?expertId=<id>&message=<url-encoded-test-input>
   ```

3. **Add triggers only after the expert works.** If the expert needs a
   trigger, add it to the bundle and re-apply. Then back-test the
   JSONLogic filter against real captured events before relying on it:
   ```
   auggie cloud event list --source github --event-type pull_request \
     --payload-filter '<your-jsonlogic>' --limit 5
   ```
   Confirm the filter matches the events you expect and *only* those.

4. **Offer the user an end-to-end trigger test.** Tell them what action
   will exercise the trigger (e.g., "open a draft PR and mark it ready
   for review") and ask if they'd like to try it now. Watch for the
   session to appear:
   ```
   auggie cloud session list --limit 5
   ```

5. **Move to the next expert** only after the current one is confirmed
   working. If expert B depends on expert A (e.g., a worker expert
   referenced by `workerExpertIds`, or a Pair Reviewer expert linked from
   a triager), apply A first, verify it, then wire B to reference A's ID.

### Why this matters

- **Faster debugging.** When something goes wrong, you know which
  expert is at fault because you tested each one in isolation.
- **User confidence.** The user sees each piece working before the
  next one is added — they're never staring at a complex pipeline
  wondering if any of it works.
- **Trigger safety.** JSONLogic filters tested against real events are
  far less likely to over-fire or miss events in production.

## Environment Operations

When managing environments on behalf of a user:

- **Prefer `duplicate`** when the user wants "the same environment with a
  small change" — it copies everything and lets you tweak just the diff.
  ```
  auggie cloud environment duplicate <id> --name "variant-name"
  ```
- **Always `validate` and `diff` before `apply`** — catch errors and show
  the user what will change before committing.
  ```
  auggie cloud environment validate -f /tmp/env.yaml
  auggie cloud environment diff -f /tmp/env.yaml
  auggie cloud environment apply -f /tmp/env.yaml
  ```
- **Ask once** if key environment inputs are missing (base image, repos,
  visibility). Don't guess — these are hard to change later.
- **Write bundle files to `/tmp/`** — the same rule as expert bundles.
  Environment bundles are transient inputs to `apply`.
