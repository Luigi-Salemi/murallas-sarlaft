# Workers

Workers are **multi-turn, async sub-agents** that a parent (manager) agent
can launch, communicate with, and terminate. They enable parallel execution
and specialization.

## Why Multi-Agent?

The main benefit of the manager-worker pattern is **focus**. Each agent
gets a dedicated context window, and that window stays clean.

Consider a single agent that both listens for Slack mentions *and*
works on a multi-hour PR task:

- Every incoming Slack message **interrupts** the PR work and pollutes
  the agent's context with unrelated chatter.
- While the agent is deep in a tool call on the PR, it **can't respond**
  to Slack promptly — the Slack side gets slow, disjointed replies.
- Both tasks degrade.

The fix is to split the responsibilities. A small orchestrator receives
the entry-point events (Slack mentions, PR webhooks, scheduled ticks)
and hands each one off to a purpose-built worker — a Slack Responder,
a PR Author, an Investigator. Each worker has a clean, dedicated
context window focused on one job.

This is also the reason coordinators usually declare `capabilities: []`
(no tools of their own) and are prompted to forbid themselves from
doing investigation directly: any real work would eat into the
orchestrator's context budget and defeat the whole point of the split.
See the Coordinator pattern below for the YAML shape.

## Delegating to Another Expert

Two ways an agent can launch another expert:

- **`worker-launch`** — starts a child session the manager controls in the background. The manager can send messages, get reports back, and terminate the worker. The user doesn't see or interact with the child session. Requires the expert to declare `workerExpertIds` or `useAllExpertsAsWorkers: true`. See How Workers Work below.

- **Deep-link URL** — emits a clickable link that opens an independent session for the user. No connection back to the originating agent. Any agent can do this. See [Experts → Deep Links](experts.md#deep-links).

## How Workers Work

An expert controls which other experts its agents can launch as workers
via one of two mutually exclusive modes:

| Mode | Config field | How the agent discovers experts | Best for |
|---|---|---|---|
| **Explicit list** | `workerExpertIds: [<id>, …]` | Expert names are embedded in the `worker-launch` tool description. Agent picks by name. | Tight orchestration where the set of workers is known at design time. |
| **All experts** | `useAllExpertsAsWorkers: true` | Agent runs `auggie cloud expert list --json` at runtime, then passes the `expert_id` to `worker-launch`. | Flexible coordinators that should be able to delegate to any expert the user has access to. |

When neither field is set, the agent has no worker tools. The two modes
are mutually exclusive — setting both is a validation error.

Once a mode is active:

1. Manager agents get tools: `worker-launch`, `worker-send-message`,
   `worker-terminate`, `worker-list`
2. Worker agents get: `worker-report-to-manager`
3. Messages are wrapped in XML tags (`<manager>`, `<worker>`) for structural
   disambiguation
4. **Cascade on archive and delete.** Archiving or deleting a manager /
   coordinator cascades depth-first through every descendant worker —
   workers below the manager are archived (or deleted) too, recursively,
   and their VMs are released. The cascade is owned by the platform
   (`ArchiveWorkersForManager` / the delete-cascade equivalent in
   `worker_service.go`), and runs even if intermediate workers were
   already archived in an earlier partial cascade, so live grandchildren
   under an archived parent still get cleaned up.
   - For the `code_review` family of experts, the platform-owned archive
     cascade is gated behind the
     `code_review_use_poseidon_archive_cascade` flag (default off) while
     the legacy in-expert bounded cascade is still authoritative. The
     delete cascade is unconditional.

   **Implication for manager prompts.** Workers cannot survive their
   manager. A manager that calls `terminate-session` synchronously after
   `worker-launch` will archive itself, which cascade-archives the
   just-launched worker and kills its task — typically with no error in
   the worker's own logs. Two canonical stop-rule idioms for manager
   prompts that launch workers:

   - **Wait-then-terminate.** After `worker-launch`, end the response
     and wait. When the worker's **terminating**
     `worker-report-to-manager` arrives (the one sent with
     `terminate=true`, signalling the worker has self-exited), then
     call `terminate-session`. Non-terminating progress reports
     (`terminate=false`, e.g. a long-lived PR Author sending its
     PR/MR URL back before continuing into monitoring) do **not**
     signal completion — see [Sessions → Self-Termination](sessions.md#self-termination)
     and knowledgebase `skills/slack/fix-via-pr-author.md` for the
     long-lived-worker pattern.
   - **Omit terminate, rely on idle auto-archive.** After
     `worker-launch`, end the response and never call
     `terminate-session`. The platform idle-archives the manager after
     the quiet period; by then the worker is done.

   > ⚠️ Symptom: a worker session archives shortly after launch with no
   > completion comment and no error in its logs. Check whether the
   > manager called `terminate-session` synchronously after
   > `worker-launch`.

## Worker Tools (Manager)

| Tool | Description |
|------|-------------|
| `worker-launch` | Launch a worker from an expert. Returns immediately. |
| `worker-send-message` | Send a message to a running worker. Non-blocking. |
| `worker-terminate` | Terminate a running worker. |
| `worker-list` | List all active workers. |

## Worker Tool (Worker)

| Tool | Description |
|------|-------------|
| `worker-report-to-manager` | Report a result back. Use `terminate=true` to self-terminate. |

Workers do **not** get the `terminate-session` tool that non-worker sessions
see — they must self-terminate via `worker-report-to-manager` with
`terminate=true` so the manager always receives a final report. See
[Sessions → Self-Termination](sessions.md#self-termination) for the full
picture.

## Manager Stop Rule

A non-worker session that launches workers — a coordinator, an
auto-trigger router, or any bespoke expert with `workerExpertIds` set —
has the `terminate-session` tool and decides for itself when to use it.
The rule:

- **Never call `terminate-session` while a launched worker is still
  running.** It cascade-archives every descendant worker and kills
  their tasks.
- **Safe to call `terminate-session`** when no worker is outstanding —
  the manager has either received the terminating report
  (`terminate=true`) from every launched worker, or never launched a
  worker on this run. A non-terminating progress report
  (`terminate=false`) does not count: the worker is still running and
  will be cascade-archived.
- **Safe to never call `terminate-session`.** The platform idle-archives
  any session after a long quiet period. For fire-and-forget routers
  whose only job is "launch a worker and stop," omitting the explicit
  terminate is the simplest correct pattern.

This mirrors the worker self-termination rule and is the symmetric case
prompt authors most often miss.

## Three Worker Roles in Practice

The shipped experts demonstrate three distinct ways an expert participates in
a worker hierarchy.

### 1. Coordinator (orchestrator-only)

A coordinator launches and routes between workers but does **no real work
itself** — no investigation, no fixes, no API calls. It typically has:

```yaml
spec:
  expert:
    capabilities: []                   # no tools — pure routing
    includeDefaultSystemPrompt: false  # default tools would tempt drift
    # Option A: explicit list of workers
    workerExpertIds:
      - <investigator-id>
      - <summarizer-id>
      - <slack-updater-id>
    # Option B: let the coordinator discover and launch any expert
    # useAllExpertsAsWorkers: true   # (mutually exclusive with workerExpertIds)
```

The prompt explicitly forbids the coordinator from doing the work itself
("If you find yourself about to investigate or fix something, STOP and send
that task to the appropriate worker instead"). This separation makes the
coordinator's reasoning compact and prevents it from exhausting its context
on details that belong in a worker.

### 2. Auto-trigger router

A small expert (often <50 lines of prompt) that fires on a webhook or
schedule, decides whether work is needed, and launches a worker for the
actual task. It is itself an auto-triggered expert (has a `triggers:` block)
and lists exactly one worker in `workerExpertIds`.

```yaml
spec:
  expert:
    capabilities: [WEB_ACCESS, GITHUB_APP]
    workerExpertIds:
      - <pr-author-expert-id>
  triggers:
    - name: PR opened
      type: github
      eventType: pull_request
      filter: '{"==": [{"var": "action"}, "opened"]}'
```

The router prompt always includes an idempotency check before launching
("Check the PR comments to see if a PR Author has already been started")
to avoid double-firing on retries or re-deliveries.

**Stop rule for the router prompt:** after `worker-launch`, end the
response. Do **not** call `terminate-session` synchronously — that
cascade-archives the just-launched worker. See § Manager Stop Rule
and the cascade-on-archive item under § How Workers Work above.

A typical auto-trigger router is a ~10-line prompt that just checks an
opt-out list and conditionally launches a PR Author worker.

## Role-Based Dispatch (One Worker, Many Roles)

A single specialist worker can be launched multiple times by the coordinator
with different "roles" in the launch message. For example, an investigator
worker can be launched **three times in parallel**, with the launch message
starting `ROLE: SEVERITY-ASSESSOR`, `ROLE: LOG-FIRST`, or `ROLE: CODE-FIRST`.
Its prompt has a "Role-Specific Starting Instructions" section that branches
on the role and gives different starting investigation sequences while
sharing all tooling and reporting structure.

This is cheaper than maintaining three nearly-identical experts and lets the
coordinator parallelize without needing distinct expert IDs.

## The "STOP and Wait" Cadence

This is the single most important and non-obvious worker pattern. Both
managers and workers need explicit prompt-level rules to honor it.

**Worker reports arrive as messages, not function returns.** When a worker
calls `worker-report-to-manager`, the manager receives a `<worker name="..."
status="...">` message in its conversation. **These messages are queued and
delivered only when the manager is idle** — not while it is in the middle of
a tool call.

The same is true in reverse: `<manager>` messages to a worker are delivered
only when the worker is idle.

**Manager prompt rule:** After launching workers, end the response and wait.
Do not loop on `worker-list` to check for completion — that prevents the
queued reports from being delivered and stalls the system. The Incident
Manager prompt spells this out: *"Anti-pattern (DO NOT DO THIS): Launch
workers → call `worker-list` → call `worker-list` → ..."*

**Worker prompt rule:** Check in every 2-4 tool calls via
`worker-report-to-manager`, then end the response. This creates a window for
the manager to deliver new context, redirects, or termination signals.

**MANDATORY first report:** Every worker prompt should require at least one
`worker-report-to-manager` call before exiting, even if all tools failed.
A common idiom is a `**MANDATORY:** You MUST call worker-report-to-manager
at least once before finishing` line in the worker prompt. This prevents
the silent-failure mode where a worker errors out without telling the
coordinator anything.
