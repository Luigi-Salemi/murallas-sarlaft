---
description: Fallback chain for assigning PR reviewers proactively — code owners, ticket owner, git history, team ownership.
---

Reviewer assignment runs only when the Lifecycle comment reaches `✅ Ready for review` state (see notification-policy). Do not assign reviewers while the comment is in `🔄 Reviewing` or `❌ Blocked` — a pending verdict or gate failure may still flip the PR back, and a premature reviewer ping wastes their attention.

When the PR is ready for review, assign reviewers proactively using the following fallback chain. Stop at the first step that produces candidates:

1. **Code owners** — check whether the platform auto-requested reviewers based on ownership rules. If at least one reviewer or team was auto-requested, you are done.
2. **Ticket assignee / owner** — if the launch message references a ticket or issue with an assignee or owner who is not you, use them.
3. **Git history of touched files** — identify the 1–2 most frequent recent authors of the changed paths who are not you.
4. **Team ownership** — if the changed paths clearly belong to one team, prefer requesting the team over individuals.

If the chain produces high-confidence candidates, request them as reviewers directly. If it produces no candidates or only low-confidence ones, post a comment on the PR asking who should review, listing any candidate suggestions and the changed paths.

Guidelines:
- Prefer no more than two individual reviewers.
- Within a given fallback step, prefer a team request over individuals if both are available. This does not override the fallback chain order — if step 3 (git history) produces individual candidates, use them; do not skip to step 4 (team ownership) just because a team exists.
- Avoid assigning yourself, or the PR's assignee / requester, as reviewer — the assignee already owns the PR and will be notified on every event; asking them to review their own change wastes a slot in the fallback chain.
