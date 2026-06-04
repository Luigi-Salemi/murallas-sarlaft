---
name: gitlab-branch-checkout
description: Check out an MR's source branch and diff against the MR's actual target branch (three-dot diff against the merge-base, not against `main`). Critical for stacked MRs where diffing against `main` would include the entire stack.
---
# Check out the branch

Fetch the MR details using the `glab` CLI and identify both the source branch and the target branch:

```bash
glab mr view <mr_number> --output json
```

Parse `source_branch` and `target_branch` from the JSON output. Check out the source branch locally:

```bash
git fetch origin
git checkout <source_branch>
```

Always diff against the MR's actual target branch, not `main`:

```bash
git fetch origin <target_branch>
git diff origin/<target_branch>...HEAD
```

This is critical for stacked MRs, where the target branch is not `main` and diffing against `main` would include changes from the entire stack rather than just this MR's incremental changes.

Confirm the checkout succeeded before proceeding. If it fails, surface the failure and ask for help before continuing.
