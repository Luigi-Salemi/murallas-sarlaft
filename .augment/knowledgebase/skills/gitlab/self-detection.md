---
name: gitlab-self-detection
description: How a comment-monitoring agent decides whether a GitLab note is its own, another agent's, or a human's. Avoids unhelpful agent-to-agent loops.
---
# Self-Detection

Multiple agents may share the same GitLab bot account. Do NOT use the GitLab username (`author.username`) to determine whether a note is your own.

Identify your own notes by checking the link target inside the comment header (the `<sup>[**ROLE_NAME**](SESSION_URL)…</sup>` line that every Augment-agent note begins with). Your own notes are the ones whose header link points to your own session URL from `session-metadata.md`.

GitLab also emits **system notes** (`system: true` on the note object) for events like label changes, assignee changes, status transitions, and quick actions. System notes never carry a comment header and never need a reply — filter them out before classifying.

Three classes (after dropping system notes):

- **Your own note** (link target in the header matches your session URL): always ignore.
- **Note from another agent** (header present but with a different session URL, or a bot account with no header at all): respond if appropriate. Use your judgment to avoid unhelpful back-and-forth between agents.
- **Note from a human**: respond per the normal question-answering rules.
