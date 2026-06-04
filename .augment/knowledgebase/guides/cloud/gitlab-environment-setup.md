# GitLab environments

GitLab is not a built-in Cosmos source-code capability. Use a custom environment
with `glab`, a GitLab access token from Secrets, and runtime `.netrc` auth.

## When to use this flow

The Advisor runs this flow when the user mentions GitLab, provides a
`gitlab.com` (or self-hosted GitLab) URL, or references a merge
request. It precedes `advisor/build-expert.md` § Construct the bundle:
the expert needs the GitLab environment ID, capability set, and
trigger shape before it can be assembled.

Cross-cutting integration rules (token-type-follows-visibility,
secret-manager storage, `WEB_ACCESS` + `CUSTOM_WEBHOOK` defaults) live
in `advisor/build-expert.md` § Non-built-in integrations; the steps
below are the GitLab specialization.

## Setup flow

### 1. Recommend a Service Account token

The `gitlab-token` secret should always be a **GitLab Service
Account** personal access token, regardless of the expert's
`visibility`. A per-human PAT looks fine for a `user`-scoped expert
today, but `user` → `tenant` is one click in the expert settings and
the moment that flip happens every MR, comment, and pipeline action
posts under the original human's name — and the expert breaks
entirely the day that human leaves the org. A Service Account token
is stable across both transitions.

Service Accounts are available on GitLab Free as of GitLab 18.11
(GA). The only place to fall back to a personal access token is
GitLab Self-Managed Community Edition (CE), which does not support
Service Accounts at all. Say that explicitly rather than linking
the user to a docs page they cannot act on.

If the user does not already have a Service Account on the target
group or project, walk them through `## Create a GitLab Service
Account` below before asking for the token.

### 2. Ensure `gitlab-token` is configured

Ask the user (via `ask-user`):

> Before I set up the environment, store a **GitLab Service Account**
> personal access token (`api`, `read_repository`, `write_repository`
> scopes) in the secret manager and name it `gitlab-token` so it
> auto-installs as `$GITLAB_TOKEN`.
> Web: **https://app.augmentcode.com/app/secrets**
> CLI: `auggie cloud secret set gitlab-token --from-stdin`
>
> A Service Account keeps this expert working when its original
> creator leaves the org and avoids posting every MR under one
> person's name once the expert is shared with the team. Need help
> creating one? Just say so.
>
> A personal access token is only acceptable on Self-Managed CE
> (no Service Account support).

Do not proceed past this step until the user confirms — verbatim —
that the secret is stored. "I'll do it later" or "the expert can
read it at runtime" is not acceptable: the verification step in
`## Verification` calls `glab` against the same token, and a
missing secret here surfaces as an opaque verifier failure rather
than as the clear setup gap it actually is.

### 3. Gather GitLab-specific inputs

Ask (via `ask-user`, one at a time, skip if already provided):

- **GitLab host**: default `gitlab.com`. Ask only if the user
  mentioned a self-hosted instance.
- **Repos to clone**: comma-separated GitLab project paths.
  Example: `augmentcode-sa/ecomm-stack,augmentcode-sa/frontend-app`.
  Each repo will be cloned under `/workspace/<project-path>`.

### 4. Create and rebuild the environment

Use `expert-templates/gitlab-cloud.yaml.template`:

1. Copy the template to `/tmp/gitlab-cloud.yaml`.
2. Replace `<GITLAB_GROUP>/<GITLAB_PROJECT_1>,<GITLAB_GROUP>/<GITLAB_PROJECT_2>`
   with the user's actual repo list.
3. If the host is not `gitlab.com`, update the `GITLAB_HOST` value.
4. Apply the environment and rebuild with both scripts:

```bash
auggie cloud environment apply -f /tmp/gitlab-cloud.yaml
auggie cloud environment rebuild <ENV_ID> \
  --provision-script knowledgebase/expert-templates/gitlab-cloud-provision.sh \
  --vm-startup-script knowledgebase/expert-templates/gitlab-cloud-vm-startup.sh
```

5. Parse the environment ID from `environment apply` output.

Do not clone with token-embedded remote URLs during the provision
step. The startup script uses `.netrc` so Git remotes stay token-free
(see `## Auth rules` below).

### 5. Point the expert at the GitLab environment

Set `spec.expert.environment.id` to the environment ID from step 4.
The expert's system prompt should instruct the agent to use `glab`
CLI commands for merge request operations and `$GITLAB_TOKEN` for any
direct API calls. Use MR (merge request) terminology, not PR.

### 6. Capabilities and triggers

GitLab experts use `WEB_ACCESS` (for web fetching/search) and
`CUSTOM_WEBHOOK` if they need live GitLab webhook subscriptions. There
is no `GITLAB` or `GITLAB_APP` capability — GitLab operations go
through `glab` in the environment.

For live events, see `## Live MR events` below for the
`auggie cloud webhook create --type gitlab` flow and the test-delivery
verification the Advisor runs before declaring setup done. If live
webhooks are not needed or unavailable, fall back to scheduled
polling.

## Create a GitLab Service Account

Use when the user does not have one yet. Prerequisites: **gitlab.com**
— top-level group Owner (for a group SA, recommended) or project
Maintainer/Owner (for a project SA); **Self-Managed EE** — instance
admin or equivalent Owner/Maintainer on the group/project;
**Self-Managed CE** — not supported, fall back to a PAT per § 1.

Walk the user to **Settings → Service accounts → Add → Manage access
tokens → Add new token** on the target group or project. Required
scopes: `api`, `read_repository`, `write_repository`. Add the SA as a
project member with **Developer** (read + non-protected push) or
**Maintainer** (protected default branch). Hand the token back to § 2
to store under `gitlab-token` in the secret manager.

Docs: https://docs.gitlab.com/user/profile/service_accounts/

## Auth rules

- `gitlab-cloud-provision.sh` installs `glab` only. It must not read
  `$GITLAB_TOKEN`, clone repos, or write credential files because provision
  script effects are baked into the shared environment snapshot.
- `gitlab-cloud-vm-startup.sh` runs on every VM boot after secrets are injected.
  It writes a mode-600 `.netrc`, clones/fetches repos under `/workspace/<path>`,
  and keeps Git remotes clean (`https://host/group/project.git`, no token).
- `glab` reads `$GITLAB_TOKEN` directly. For self-hosted GitLab, also set
  `GITLAB_HOST` in the environment bundle.
- Do not use token-embedded clone URLs as the default. If forced to use one for
  a broken Git environment, immediately reset the remote URL to the clean form
  before doing anything else.

## Live MR events

For real-time MR monitoring, create a GitLab custom webhook:

```bash
auggie cloud webhook create --type gitlab --description "GitLab code notifications"
auggie cloud webhook instructions <WEBHOOK_ID>
```

Configure the printed URL/secret in GitLab. Runtime subscriptions use
`source: "CUSTOM"` and payload filters on GitLab fields such as `object_kind`,
`project.path_with_namespace`, `object_attributes.iid`, and
`object_attributes.sha`; subscriptions do not filter by webhook ID.

After the user saves the hook in GitLab, fire a test delivery before declaring
setup done — GitLab's auto-disable kicks in silently after a few failed
deliveries, so a wrong secret token is invisible until traffic stops:

```bash
glab api --method POST "projects/<urlencoded-path>/hooks/<hook-id>/test/merge_requests_events"
```

`<urlencoded-path>` is the GitLab project path with `/` encoded as `%2F`
(e.g. `group%2Fapi` for `group/api`); `<hook-id>` is the numeric ID from
`glab api projects/<urlencoded-path>/hooks`. Interpret the response:

- HTTP 2xx → delivery worked; setup is complete.
- HTTP 422 with `Hook execution failed` → almost always the secret token in
  GitLab does not match what Cosmos issued. Re-run
  `auggie cloud webhook instructions <id>`, have the user paste the secret
  into GitLab's hook config, and retry.
- Any other non-2xx → surface the body verbatim and avoid declaring setup
  done.

If custom-webhook subscriptions are unavailable, GitLab MR experts should fall
back to scheduled polling.

## Verification

The Advisor runs this block via the `verify-gitlab-env` expert
(`expert-templates/verify-gitlab-env.yaml.template`) — a hidden,
tenant-visible one-shot whose system prompt executes the commands sent
in its first user message and emits `VERIFICATION_RESULT: PASS|FAIL`
for the Advisor to parse. See `advisor/build-expert.md` § Verify the
integration for the full polling loop. Resumed sessions keep old
snapshots — the verifier always uses a fresh `auggie cloud session
create` so this is handled automatically.

Commands:

```bash
which glab && glab --version
test -f ~/.netrc
git -C /workspace/<group>/<project> remote -v
git -C /workspace/<group>/<project> fetch --dry-run
glab api /personal_access_tokens/self
```

Pass criteria (the Advisor appends these verbatim to the verifier's
message so the verifier's default-PASS rule is overridden):

- every command exits with code 0
- `git remote -v` output contains no token
- `glab api /personal_access_tokens/self` response lists `api`,
  `read_repository`, and `write_repository` in `scopes`

If any scope is missing, recreate the token with the missing scopes,
re-store it under `gitlab-token`, and retry. For Service Account
tokens whose `/self` does not resolve, list tokens via
`glab api /personal_access_tokens` and inspect the matching entry.

A missing scope surfaced here is a clear setup failure; a missing scope
discovered at runtime surfaces as an opaque MR operation failure.
