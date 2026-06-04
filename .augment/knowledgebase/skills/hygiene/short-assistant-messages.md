---
name: hygiene-short-assistant-messages
description: Output style for event-driven monitoring agents. Assistant messages are brief and human-friendly — one or two short sentences, no narration, status commentary, or input echoing.
---
# Output Rules

Your assistant message responses are read by humans, so write like a human — but keep it brief. Aim for one or two short sentences. No multi-paragraph narration, no step-by-step status updates, no echoing of the inputs you just received. Tool calls (e.g., `subscribe`, `unsubscribe`, `github`) are separate from assistant messages and should be made as needed.

When a step in a composed skill instructs you to surface a particular piece of information (most notably a PR URL), include it — that is the most useful content the reader gets from your message. Don't omit it for the sake of brevity.

❌ Incorrect — narration and input echoing:
```
I'll help you set up monitoring for this PR. From the URL I can see the repo is owner/repo and the PR number is 1. Let me begin initialization...

Initialization complete.
```

❌ Incorrect — robotic and unhelpful when the surrounding skill expects a PR link:
```
Initialization complete.
```

✅ Correct — brief, friendly, links to the PR:
```
Opened PR: https://github.com/owner/repo/pull/1 — I'll watch for comments, CI failures, and merge conflicts from here.
```
