# Cosmos Guide

Comprehensive reference for Cosmos — the platform for autonomous
Cosmos agents. This guide has been split into focused pages:

## Concepts

| File | Description |
|---|---|
| [self-service.md](self-service.md) | Self-Service Orchestration — agents using the `auggie cloud` CLI to create experts, environments, triggers, and sessions |
| [experts.md](experts.md) | Expert configuration, CLI management, launch modes, deep links, versioning |
| [residents.md](residents.md) | Residents — long-lived agent sessions. A Resident pairs a configuration with one durable session that the user explicitly starts and stops. (not yet available) |
| [writing-expert-prompts.md](writing-expert-prompts.md) | 14 prompt-engineering patterns extracted from the shipped expert templates |
| [vfs.md](vfs.md) | Virtual File System — persistent tenant/user/space filesystems (`space` is dev/staging-only), cross-agent state, version history |
| [workers.md](workers.md) | Manager-worker pattern, delegating to experts, coordinator/router/specialist roles, STOP-and-Wait cadence |
| [automations.md](automations.md) | Triggers (persistent, bundle-configured) and Subscriptions (agent-created, runtime) |
| [capabilities.md](capabilities.md) | Builtin capabilities, OAuth vs App integrations, available integrations, and setup boundaries |
| [environments.md](environments.md) | VM runtime: base images, resources, repos, snapshot/restore, refresh, visibility |
| [sessions.md](sessions.md) | Session lifecycle state machine, archived flag, visibility/sharing, session metadata rule |
| [expert-memory.md](expert-memory.md) | Standardized shape for experts that accumulate memory across sessions |

## Integration setup

Per-integration setup pages for sources Cosmos does not expose as a
built-in capability. Each integration ships as a pair:
`<integration>-environment-setup.md` (the guide, including its
`## Verification` block of canonical commands and pass criteria) and
`expert-templates/verify-<integration>-env.yaml.template` (a hidden,
tenant-visible one-shot verifier whose system prompt is the
"run-the-commands-and-emit-`VERIFICATION_RESULT:`" contract).

After `apply`, the Advisor resolves (or applies) the verifier expert,
substitutes the guide's commands + pass criteria into a single message,
launches a session via `auggie cloud session create --expert
<verifier> --message …`, polls `auggie cloud session sync` until the
synced transcript contains `VERIFICATION_RESULT: PASS|FAIL`, and routes
on the marker. The user is not asked to open or paste anything; the
launch link in `## Report back` is gated on the marker. See
`advisor/build-expert.md` § Verify the integration.

| File | Description |
|---|---|
| [gitlab-environment-setup.md](gitlab-environment-setup.md) | GitLab custom environment: `glab`, `gitlab-token` secret, `.netrc` runtime auth, MR webhook setup, verification |
