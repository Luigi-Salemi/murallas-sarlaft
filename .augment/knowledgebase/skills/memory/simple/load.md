---
name: memory-simple-load
description: Simple-memory loader — thin wrapper around `kb://skills/memory/load-memory.md` for teams that use the simple (single-tier) memory model. Loads bullets from `knowledge/{SCOPE}.md` written by `kb://skills/memory/simple/capture.md`. The calling expert supplies the team name and scope key via its context.
---
# Simple-memory load

For simple-memory teams (see knowledgebase `guides/cloud/expert-memory.md`). Loads the per-scope knowledge file written by `kb://skills/memory/simple/capture.md`.

The reader mechanics are identical to the noisy model — both write to `knowledge/{SCOPE}.md`, both group bullets under `##` headings — so this skill simply includes the shared loader. The only difference for simple-memory teams is that the `##` headings are team-defined (action classes, topic names) rather than file-path globs, and bullets carry no `(seen N× …)` annotation. The calling team's binding documents which heading vocabulary applies.

<include src="kb://skills/memory/load-memory.md" />
