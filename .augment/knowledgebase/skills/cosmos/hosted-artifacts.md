---
name: cosmos-hosted-artifacts
description: Upload a local file via `auggie cloud artifact upload` to get a reviewer-accessible URL embeddable on any external surface. Default destination for verdict-cited proof and any other reviewer-visible file output (50 MiB cap, 15-min signed-URL TTL on retry). Covers upload, embed forms, `auggie cloud artifact delete` undo, and the cleanup-ledger exemption (durable evidence, not a session side effect).
---
# Hosted artifacts

Default destination for any file an external reviewer must fetch — screenshots, videos, terminal recordings, log/transcript captures, request/response dumps, large JSON. Switch to another reviewer-accessible URL only if the run requires it (e.g., file > 50 MiB, or the user asks for a specific destination). Do not use VFS for proof — share URLs render an HTML viewer, not raw bytes, so image embeds break.

# Upload

```sh
auggie cloud artifact upload <path> [--label "<text>"] [--media-type <type>]
```

- Prints the canonical URL on stdout — capture it; that is what you embed.
- Anyone holding the URL can fetch — the URL is the access control. Post only on surfaces that need it. `--visibility` currently accepts only the default; other values are rejected before upload.
- `--media-type` defaults from extension; set explicitly for `.bin`, `.log`, or other ambiguous files so image proxies route correctly.
- `--label` is a free-form hint shown in the artifact UI; not in the URL.
- Per-file cap **50 MiB**. Larger files fail fast — trim, downsample, or split. Do not chunk to bypass.
- Signed PUT URL expires 15 minutes after creation; matters only on retry.
- Redact secrets **before** upload — the URL is reviewer-visible by design.

# Embedding

The URL works on any external surface. Pick by artifact type:

- **Image embed** `![alt](<url>)` — for raw-bytes images (PNG, JPEG, GIF, WebP); renders inline via GitHub's image proxy.
- **Plain link** `📷 [alt](<url>)` / `🎬 Video: [watch](<url>)` — for video, large downloads, viewer-only pages.
- **Code-fenced excerpt + link** — for textual artifacts; show a snippet in-thread, link the full file.

# Lifecycle

- Hosted artifacts are **durable proof** and outlive the session by design. **Never** add an upload to the cleanup-side-effects ledger.
- Delete only an artifact uploaded in error or containing content that should not have been published — `auggie cloud artifact delete <artifact_id>`.
- One fresh upload per run; do not overwrite. The URL couples the artifact to the run that produced it.
