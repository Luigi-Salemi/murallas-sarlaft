---
name: github-branch-checkout
description: Check out a PR's source branch and diff against the PR's actual base branch (three-dot diff against the merge-base, not against `main`). Critical for stacked PRs where diffing against `main` would include the entire stack.
---
# Check out the branch

Fetch the PR details from the GitHub API and identify both the source branch (`head.ref`) and the base branch (`base.ref`). Check out the source branch locally:

```bash
git fetch origin
git checkout <head-branch>
```

Always diff against the PR's actual base branch, not `main`:

```bash
git fetch origin <base-branch>
git diff origin/<base-branch>...HEAD
```

This is critical for stacked PRs, where the base branch is not `main` and diffing against `main` would include changes from the entire stack rather than just this PR's incremental changes.

Confirm the checkout succeeded before proceeding. If it fails, surface the failure and ask for help before continuing.
