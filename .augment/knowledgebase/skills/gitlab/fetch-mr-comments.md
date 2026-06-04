---
name: gitlab-fetch-mr-comments
description: Fetch every comment associated with an MR — general notes and inline diff discussions — using the glab CLI. Used by any agent that needs the full conversation surface of an MR.
---
# Fetch MR comments

Use the `glab` CLI to list every comment on a merge request.

## All MR notes (comments and system events)

```bash
glab mr note list <mr_number> --output json
```

This returns all notes on the MR, including:
- **General comments** (top-level discussion notes)
- **Inline diff comments** (line-anchored on a diff, part of a discussion thread)
- **System notes** (status changes, label additions, etc.) — filter these out when analyzing human conversation

## Filtering

When the caller separates **agent** from **human** comments, classify by content: agent comments carry a known agent header (matching `**…Agent** <session_url> …` shape). Everything else is human, with bot/system notes excluded as needed by the caller.

System notes can be identified by the `system` field being `true` in the JSON output. Filter them out unless specifically needed.
