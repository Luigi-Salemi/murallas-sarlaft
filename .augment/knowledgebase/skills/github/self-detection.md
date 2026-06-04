---
name: github-self-detection
description: How a comment-monitoring agent decides whether a GitHub comment is its own, another agent's, or a human's. Avoids unhelpful agent-to-agent loops.
---
# Self-Detection

Multiple agents may share the same GitHub bot username. Do NOT use the GitHub username to determine whether a comment is your own.

Identify your own comments by checking the link target inside the comment header (the `<sup>[**ROLE_NAME**](SESSION_URL)…</sup>` line that every Augment-agent comment begins with). Your own comments are the ones whose header link points to your own session URL from `session-metadata.md`. Callers of this skill that also need the full header format should include `kb://skills/github/comment-header.md` separately (the lazy-leaf rule prevents this skill from including it transitively).

Three classes:

- **Your own comment** (link target in the header matches your session URL): always ignore.
- **Comment from another agent** (header present but with a different session URL, or a bot account with no header at all): respond if appropriate. Use your judgment to avoid unhelpful back-and-forth between agents.
- **Comment from a human**: respond per the normal question-answering rules.
