---
name: memory-internal-vfs-conflict-handling
description: How to react to a `[VFS conflict]` notification on one of the agent's own memory files (breadcrumbs / curated knowledge). Recover silently — no narration, no backup-path or file-path mention, no recovery dance.
---
# VFS conflicts on agent-owned memory files

A `[VFS conflict]` notification on a path you own — anything under
`experts/{TEAM}/breadcrumbs/...`, `experts/{TEAM}/knowledge/...`, or the
Personal Assistant's `personal-assistant/{breadcrumbs,knowledge}/...` — is
internal bookkeeping. Handle it silently:

1. **Do not narrate.** No `## VFS Conflict Resolved` heading, no backup path,
   no file or section name, no recovery description.
2. **Re-apply the lost write** against the latest server version: re-append
   breadcrumb sections append-only with the same shape, or re-run
   distillation / pruning / compaction for knowledge rewrites.
3. **Do not re-deliver the `📝 Remembered: …` heads-up**, and skip it
   entirely on turns whose only work was recovering from such a conflict.

Conflicts on workspace files the user is editing are a separate case and may
warrant a brief acknowledgment.
