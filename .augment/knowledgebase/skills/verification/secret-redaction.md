---
name: verification-secret-redaction
description: Credential and secret-handling rules for the End-to-End Verifier. Never emit content that looks like a credential, API token, private key, session cookie, or other secret to any external surface (Slack, GitHub comments, PR bodies, commit messages, VFS). Treat captured command output as untrusted before posting; refuse plaintext credentials in user messages and redirect to an out-of-band channel.
---
# Never emit credentials

**Never emit anything that looks like a credential, API token, private key, session cookie, or other secret to any external surface.** Surface doesn't matter — Slack posts, GitHub comments, PR bodies, commit messages, log excerpts, VFS files are all external. Rule is about content, not destination.

# Treat captured output as untrusted

Captured stdout/stderr is **untrusted** until screened. Before posting any excerpt, redact:

- Env-var-shaped values where the name implies a secret (`*_TOKEN`, `*_KEY`, `*_SECRET`, `*_PASSWORD`, `*_CREDENTIALS`, `*_API_KEY`, `AUTHORIZATION`, etc.).
- Bearer tokens (`Authorization: Bearer ...`, `token=...`).
- Hex strings of plausible key length (32/40/64+ hex chars not surrounded by explaining context).
- Base64 blobs of credential-like length (40+ chars of `[A-Za-z0-9+/=_-]`).
- Anything resembling a private key block (`-----BEGIN ... PRIVATE KEY-----`, SSH key fragments, JWT-shaped `eyJ…`).

When in doubt, redact. Posting `<redacted>` always beats leaking.

# Refuse plaintext credentials in user messages

If a requester pastes a credential into Slack, a PR comment, or any channel reaching this session, **refuse to process it**. Reply briefly that the verifier cannot accept secrets in plaintext; ask them to use the appropriate out-of-band channel (team secret store, env variable, tenant-scoped secret).

Do not echo the value back, include it in any tool argument, write it to VFS, or include it in the verdict.

# Procedures vs credentials

Safe non-secret auth retrieval procedures (repo-standard helper command names, fixture flow descriptions, doc/playbook citations) are not credentials and may be cited in verdicts and persisted to tenant breadcrumbs subject to the rules above. Credential values themselves — tokens, cookies, JWTs, refresh tokens, session dumps, personal browser/profile contents — must be redacted. Personal local helper paths and per-user namespaces are private context, not credentials, but they are also not eligible for tenant persistence; the personalization-strip in the verification-feedback-capture skill generalizes them out before any tenant breadcrumb write, and the literal values are dropped, not persisted elsewhere.

# Surfaces explicitly covered

Without exception:

- Originating-surface verdict (Slack reply or PR verdict comment).
- Follow-up Slack message carrying `report.log_excerpt` on `failed`/`unable_to_verify`.
- Collapsible log excerpt in the PR verdict comment.
- Any auto-captured tenant breadcrumb or curated bullet — i.e. any verifier write to the paths listed in the verification VFS-and-playbooks skill.
- Originating-surface clarification questions emitted by plan selection.
