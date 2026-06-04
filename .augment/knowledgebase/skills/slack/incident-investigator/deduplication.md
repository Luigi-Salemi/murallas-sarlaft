---
name: incident-investigator-deduplication
description: Shared deduplication guidance for any Slack alert / incident expert that may be re-triggered on the same thread — detect prior self-posts via `conversations.replies` (not hidden HTML markers, which Slack mrkdwn renders as literal text) before reposting.
---

Do not embed hidden HTML comments or trailing markers in Slack messages (Slack mrkdwn renders them as literal text). To detect prior posts on a re-trigger, call `conversations.replies` on the thread and check whether any reply has `user == <your own bot user id>` (the id named in the adopting bundle's *Identity* section) and the same material content (e.g. same root-cause finding, same PR link, same post-mortem heading). If yes, do not repost. Replies authored by sibling AI agents (named in the adopting bundle's *Sibling agents* section) — or by any user that is not your own bot user — never count as your prior post and must not block you from posting your own analysis.
