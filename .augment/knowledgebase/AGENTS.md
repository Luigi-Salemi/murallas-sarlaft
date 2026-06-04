# AGENTS.md — Knowledgebase Authoring Rules

Rules for agents creating, editing, or restructuring files under
`knowledgebase/`. The audience for the knowledgebase itself is
**other agents**, not humans — optimize for that.

## These files are not low-risk

Files under `knowledgebase/` are Markdown, but they are not
low-risk. Every skill, guide, and template here is composed into
expert system prompts that run against customer tenants — a wrong
word, a stale instruction, or a broken `<include>` reaches users
the next time an affected expert applies. Review and validate
changes here with the same scrutiny you would apply to production
code, not the lighter touch a typical Markdown doc gets.

## Conventions

### Folder layout under `skills/`

Skill files are organised along two axes — the platform integration
the skill talks to, and the topic the skill is about:

- `skills/<topic>/<skill>.md` — integration-neutral. The body must
  not name a specific platform or call out platform-specific tools,
  headers, or APIs.
- `skills/<integration>/<skill>.md` — integration-specific with no
  narrower topic.
- `skills/<integration>/<topic>/<skill>.md` — integration-specific
  and topic-scoped, used when several such skills accumulate.

A skill that is generic in concept but written against one platform
is integration-specific. If a second integration ever needs the
same concept, the integration-neutral version is a new file at
`skills/<topic>/<skill>.md`, not a rename of the integration-specific
one.

### No loose cross-references inside `skills/`

Inside `knowledgebase/skills/`, do not write prose like "see
`skills/foo.md`" — skill fragments are composed into prompts by the
include resolver, and a loose hint is invisible to it.

Every cross-reference from a skill file to another skill file must
be an `<include>` directive in one of two modes:

- **Eager `<include src="kb://..." />`** — at session-start render
  the resolver substitutes the target file's full body (nested
  includes recursively resolved) in place of the directive. Use
  when the content is always relevant in context.
- **Lazy `<include src="kb://..." mode="lazy" />`** — at
  session-start render the resolver emits a `<lazy-prompt-module>`
  block in place of the directive: a compact pointer carrying the
  target's front-matter `description` and an explicit `auggie cloud
  prompt-module render <URI>` command. The body is not inlined. At
  runtime the agent reads the description and, only if it applies,
  runs the render command to expand the module on demand. Use when
  the content applies conditionally and inlining would waste
  context. Lazy targets may themselves contain `<include>`
  directives — they are resolved when the render command runs.

Prefer **eager** by default. Switch to **lazy** only when an eager
include would duplicate the target's body in the rendered prompt —
i.e. when the same target is also referenced independently by the
composing expert or by sibling skills. The resolver caches fetches,
not output positions, so each eager include of a shared target
inlines its body again at every reference site. For pure
flow-control hints between phases ("now do phase X"), use neither —
let the composing expert sequence the skills.

This rule does not apply to references *between* `guides/`,
`expert-templates/`, and top-level `README.md` files — those are
read by agents through dispatch tables and may freely
cross-reference by path. References from any of those files **into
`skills/`** are still fragile: the include resolver does not see
them, so a skill rename or move silently breaks the link. Keep such
references rare; when one exists, the skill's path becomes part of
the knowledgebase's public surface — before renaming or moving the
skill, grep for the old path across the whole knowledgebase.

### `<include>` directive mechanics

- The directive must appear on its own line. There is no inline
  form; whitespace before and after is preserved as-is.
- `src` is a `kb://skills/...` URI ending in `.md`. Each URI
  resolves to exactly one file; there is no path search or
  override.
- `<include-module>` is accepted as a compatibility alias for
  `<include>` and renders identically; prefer `<include>` in new
  files.
- An inline include renders wrapped in a
  `<prompt-module name="..." src="...">` boundary; a lazy include
  renders as a `<lazy-prompt-module>` pointer.
- Maximum include depth is 8. Cycles (by URI) and broken URIs are
  hard errors at apply-time lint. At session-start render they are
  reported as warnings inserted into the prompt, and the session
  starts in a degraded state rather than failing.

### Don't use `kb://` URIs in prose for skill → non-skill references

The `kb://` scheme is resolved by the include resolver inside the
`src=` attribute of an `<include>` directive. It also appears at
runtime inside the `auggie cloud prompt-module render <URI>`
command that a lazy `<lazy-prompt-module>` block carries — but only
there, and only because the agent has an explicit rule to run that
command when the block's situation applies. A bare `kb://...` token
sitting in arbitrary prose — e.g. "see `kb://guides/cloud/foo.md`"
in a step the agent is supposed to act on — has no such handling;
the agent has no general rule that turns a kb URI into an open-file
or render action.

When a skill needs to point an agent at a file outside `skills/`
(typically a `guides/` page or an `expert-templates/` example) and
that file isn't being inlined, write the reference as a plain
knowledgebase-relative path: "see knowledgebase `guides/cloud/foo.md`"
or "see knowledgebase `expert-templates/`". The agent knows where
the knowledgebase lives because Cosmos injects that location into
the system prompt, and the path-only form makes it unambiguous.
Reserve `kb://` URIs for the `src=` attribute of `<include>`
directives.

This rule is the complement of "No loose cross-references inside
`skills/`" above: skill → skill links must always be `<include>`
directives (so the resolver can see them); skill → non-skill links
that aren't being inlined must be plain `see knowledgebase ...`
prose (so the agent reading the rendered prompt has an
unambiguous, resolvable path).

### Skills don't declare parameters

Per-expert variation is expressed through composition (include a
different skill) and through prose in the expert's context block
(role name, on-behalf-of identity, emoji, etc.). Skills refer to
those facts by name ("the role name given in your context") and
the model performs the binding.

Per-session values (session URL, GitHub username, user email,
tenant ID, …) are not substituted by the resolver. They live in
`session-metadata.md`; skills that need one refer to it in prose
("your session URL from `session-metadata.md`") and the model
reads it at the point of use. Do not invent template variables or
placeholder syntax inside a skill body for these values.

### Onboarding header on every template

Every `expert-templates/*.yaml.template` must open with a top-of-file
comment block capturing any expert-specific setup or operational
detail that an agent applying or adopting the template would need but
**will not find in the structured bundle fields** (`description`,
`userInstructions`, `placeholderText`, `capabilities`, `triggers`,
etc.).

If a piece of information has a structured field, put it in the
field — do not duplicate it in the header. The header is the escape
hatch for everything that does not fit, for example:

- How the agent should interact with the operator when setting up
  the expert (questions to ask, values to collect, opt-in toggles
  the operator must flip in the webapp after `apply`).
- Cross-repo coupling that must be updated in lockstep when this
  template changes (e.g. `default-expert-seeds.ts`).
- `<PLACEHOLDER>` markers and how to resolve them (which expert to
  apply first, which CLI command returns the ID).
- Manual webapp steps that `apply` cannot perform on its own.

If none of the above applies, the header may be a single-line
comment naming the expert. See `pr-author.yaml.template` and
`end-to-end-verifier.yaml.template` for the existing form.

### Write for the Advisor or for runtime experts, never both

Every file in the knowledgebase is read by **either** the Advisor
(at expert `apply` time) **or** by runtime experts (as part of a
rendered system prompt, or as a file opened on demand) — never the
same file by both.

- **Advisor-side:** `advisor/playbook.md`, every
  `expert-templates/*.yaml.template` (including the structured
  bundle fields — `displayName`, `description`, `userInstructions`,
  `placeholderText`, etc. — and the onboarding header), and all
  `guides/*` and `README.md` pages the Advisor consults on demand.
  The runtime expert never sees any of this. Do not put runtime
  instructions here.
- **Runtime-expert side:** `expert-templates/prompts/*.md` and
  anything `<include>`d into a `systemPrompt`. Do not put
  apply-time or Advisor-onboarding instructions here.

Before adding a paragraph, name the side it belongs to, and verify that
you have added it to the right location.

### Concise, non-duplicative, agent-readable

The knowledgebase is read by intelligent agents, not humans.

- Keep files short. Prefer one canonical page per concept and link
  to it (via `<include>`) instead of restating it.
- **One concept, one file.** A skill owns exactly one concept; that
  concept does not also live in a sibling skill, a guide, or an
  expert prompt. When a second file needs the same information,
  replace the second copy with an `<include>` (or, for guides and
  templates, a `see knowledgebase ...` reference).
- Do not duplicate content across `guides/`, `skills/`, and an
  expert prompt. If an expert needs a fragment that another expert
  also needs, extract it into `skills/` and `<include>` it from
  both prompts.
- **Front-matter `description` must be one sentence.** Lazy
  `<lazy-prompt-module>` pointers inline the description into every
  consumer's prompt at render time; a paragraph-long description
  pays its cost on every load and crowds out the surrounding
  context.
- **Cut detail, not coverage.** Long lists of fine-grained
  instructions dilute the agent's attention and start contradicting
  each other as the file grows. If a section has more than a
  handful of bullets, suspect that several of them restate the same
  rule or could be implied by a single principle.
- Do not write narrative or motivational prose ("This guide will
  walk you through…"). Lead with the rule or the reference.
- Do not restate built-in tool semantics that the agent already
  knows from its system prompt.

### No duplication across a template's transitive skill closure

For any `expert-templates/*.yaml.template`, treat the union of every
skill it `<include>`s — directly and transitively, through both
eager and lazy includes — as a single rendered prompt. Ideally no
fact, rule, header format, policy, or instruction in that closure
appears in more than one file. When two skills in the closure would
otherwise need to repeat the same content, extract it into a third
skill and `<include>` it from both, rather than restating it.

When adding to or editing a skill, walk the transitive closure of
every template that pulls it in and check that the new content does
not already exist elsewhere in that closure. If it does, edit the
canonical source instead of duplicating; if no canonical source
exists yet, create one and replace the duplicate with an `<include>`.
This applies even when the duplication is paraphrased — the agent
reads the rendered prompt as one document, and repeated guidance
wastes context and risks the two copies drifting out of sync.

## Additional rules

### Attribute every external-surface message

Every expert that posts to an external surface (GitHub PR/issue
comments, Slack channels and threads, Linear or Jira comments,
custom-webhook responses, …) must attribute every message it sends
with the expert's display name and a clickable link to its session
URL. Without this, humans on the receiving end cannot tell which
agent posted what or jump back to the session that produced the
message.

This is non-negotiable for any new expert with a write-capable
external capability — wire the attribution requirement into the
system prompt at construction time, not as a follow-up.

### Manifest must stay in sync

Every file added, moved, or renamed under `skills/`, `guides/`, or
`expert-templates/` must be reflected in `manifest.yaml` in the same
change.

### Prefer parameter blocks over inline IDs

Tenant-specific UUIDs (expert IDs, environment IDs, integration
IDs) must appear as `<PLACEHOLDER>` markers, with the resolution
recipe in the template's onboarding header and in
`expert-templates/README.md` § Before Applying. Do not paste real
IDs into committed files — they will not match any other tenant.

### README files are dispatch tables, not tutorials

The `README.md` at the root of `knowledgebase/` and at the root of
each top-level subdirectory exists to route an agent from a user
question to the single canonical page. New top-level concepts must
be added to the relevant dispatch table in the same change as the
new page itself, otherwise the page is effectively unreachable.

### Validate before committing

Before committing changes that touch an expert bundle or a prompt
it includes, run:

```bash
auggie cloud expert validate -f expert-templates/<name>.yaml.template
```

This catches broken `<include>` paths, missing skills, and
malformed bundle YAML before they reach a tenant that applies the
template.

### Stage skill changes via VFS before merging

Merging a skill change ships it to every production expert that
includes it. To test a skill change in isolation first:

1. Copy the affected subtree of the knowledgebase into VFS — e.g.
   `tenant/staging-kb/skills/<area>/<skill>.md` — using the same
   relative layout as `kb://`.
2. In a staging expert bundle, swap the `<include>` directive's
   `src=` from `kb://...` to the matching `vfs://tenant/staging-kb/...`
   path and `auggie cloud expert apply` it on staging.
3. Iterate on the VFS copy and exercise the expert until the change
   is proven out.
4. When the change is ready to ship, port the VFS edits back into
   the `kb://` source in this repo, merge the PR, then delete the
   `tenant/staging-kb/...` copy and revert the staging expert's
   `src=` back to `kb://...`.

These steps mutate tenant-shared VFS state and a staging expert
bundle. Ask the user for explicit permission before running any of
them, and confirm again before the cleanup in step 4.

Do not leave a long-lived VFS shadow copy of the knowledgebase
running — it drifts from `kb://` and silently overrides production
behavior for any expert still pointing at it.
