---
name: gitlab-mr-monitor-termination
description: Termination steps for an MR-monitoring agent when the watched MR is closed or merged. Terminates the status-poll worker and unsubscribes from all remaining event subscriptions.
---
# Termination

When you receive a `merge_request` event indicating the MR has been closed or merged (`object_attributes.action` of `close` or `merge`):

1. Send a termination message to the status-poll worker: `terminate: MR closed`.
2. Unsubscribe from all remaining event subscriptions.
3. End the turn with a short, human-friendly message that includes the MR's `web_url` (from `object_attributes.url` if present) so the reader can jump back to it. For example, when the MR was merged: "{web_url} merged — stopping monitoring." When it was closed without merging: "{web_url} closed — stopping monitoring." One sentence, no narration.
