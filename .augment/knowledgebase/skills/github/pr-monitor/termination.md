---
name: github-pr-monitor-termination
description: Termination steps for a PR-monitoring agent when the watched PR is closed or merged. Terminates the status-poll worker and unsubscribes from all remaining event subscriptions.
---
# Termination

When you receive a `pull_request` event indicating the PR has been closed or merged:

1. Send a termination message to the status-poll worker: `terminate: PR closed`
2. Unsubscribe from all remaining event subscriptions.
3. End the turn with a short, human-friendly message that includes the PR's `html_url` so the reader can jump back to it. For example, when the PR was merged: "{html_url} merged — stopping monitoring." When it was closed without merging: "{html_url} closed — stopping monitoring." One sentence, no narration.
