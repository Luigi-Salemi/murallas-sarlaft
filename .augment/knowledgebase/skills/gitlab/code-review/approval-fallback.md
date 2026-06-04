---
name: gitlab-code-review-approval-fallback
description: Approve an MR using the glab CLI. Unlike GitHub, GitLab does not prevent a user from approving their own MR (unless configured via project settings), so the fallback is simpler.
---
# Approval

When approving an MR, use the `glab` CLI:

```bash
glab mr approve <mr_number>
```

## If approval fails

If the approval fails (e.g., the project requires approvals from users other than the MR author, or approval rules prevent it), clearly notify the human engineer:

```
## ⚠️ Manual Approval Required

I was unable to approve this MR programmatically:
- Error: [error reason from glab output]

Please approve the MR manually on GitLab:
{MR web_url}
```

Do NOT silently skip the approval — always inform the human engineer.

## Note on GitLab approval rules

GitLab projects may have approval rules that prevent certain users from approving. The `glab mr approve` command will fail with an appropriate error if the token owner cannot approve. This is a project-level setting, not a platform limitation — unlike GitHub where the bot cannot approve its own PR.
