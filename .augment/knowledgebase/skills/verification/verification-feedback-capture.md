---
name: verification-feedback-capture
description: Verification-specific binding for the generic memory feedback-capture skill. Sets TEAM=verification and SCOPE={owner}/{repo}, requires a `Kind:` header from the verification insight-kinds catalog on every captured section, and adds a personalization-strip pass before tenant persistence. Heads-up to the human only on Slack-triggered runs.
---
# Capture verification feedback

Bindings for the included generic feedback-capture skill:

- `{TEAM}` = `verification`
- `{SCOPE}` = `{owner}/{repo}` resolved from the PR being verified.

Verification specializations of the generic rules:

- "Insights" here means **verification insights**: things that would change a future verifier run for the same repo or subsystem. Every captured section declares one `Kind:` from the verification insight-kinds catalog above; apply the generic decision filter under the kind's lens.
- Capture is invoked at end-of-run by the verifier prompt's stopping rule (timing, ordering, and the "every verdict" rule live there). Failures and unable-to-verify outcomes are usually the most valuable learnings; routine `passed` runs typically reinforce existing `procedure`/`oracle` bullets via the source-weight merge in `curate-knowledge`, not new entries.
- Heads-up is shown **only on Slack-triggered runs** (`response_surface == slack`). On GitHub-triggered runs the `📝 Remembered:` line would have to land in the PR thread (the only writable surface the verifier owns there) where it would add noise to the verdict comment thread and fight reviewer attention; it is suppressed for that reason, not because nobody is watching. On Slack the heads-up is one short in-thread reply.
- **Sources the verifier emits.** Of the five values defined in the generic source-weights table, the verifier emits exactly these two — `human-comment`, `human-reaction`, and `pr-outcome` are not produced by this expert (it does not noise-filter PR comments for insights, does not track reactions on its own posts, and terminates before any merge/close outcome is observable):
  - `agent-inferred` (×1) — observations the verifier made itself (commands that worked, flakes hit and recovered from, plan-source corrections, runtime evidence).
  - `human-feedback` (×3) — content from a requester reply that arrived as a `<user>` message on a later turn before termination (a Slack in-thread reply, or a PR-comment reply to the verifier's clarification on GitHub).
- The curate step promotes a bullet to visible curated knowledge once the evidence score reaches 3. A single `human-feedback` capture clears the threshold; routine `passed` runs typically reinforce existing `agent-inferred` bullets via the source-weight merge (×1 + ×1 + ×1 = 3 across three runs against the same title/kind/path) rather than producing new entries.
- Each section's prose anchor is the **PR URL** (`https://github.com/{owner}/{repo}/pull/{number}`); a cross-cutting verification insight (dev-deploy, readiness procedure, …) uses `Paths: (none)` per the generic rule.
- Section shape extends the generic `## <short title>` template with one extra header bullet, `- **Kind:** <one of the six kinds>`, placed immediately after `- **Source:**`. Do not invent any other verifier-specific subsections.
- **Never** title a captured section with one of the playbook's reserved titles (`## Setup` / `## Exercise` / `## Teardown` / `## Notes`, owned by the playbook file). Auto-captured setup/exercise/teardown observations land under topic headings such as `## Setup notes`, `## Exercise notes`, `## Known flakes`, `## Dev deploy`, or path-glob headings.

# Capture triggers

End-of-run, walk this checklist and write a breadcrumb for every trigger that fired:

- `plan_source = inferred:*` and verdict `passed` → working Setup + Exercise as `procedure`.
- Runtime evidence contradicted a loaded bullet (cached commands failed, observed behavior didn't match a cached oracle, …) → corrected observation as `agent-inferred` under the same kind. The source-weight merge in `curate-knowledge` resolves the conflict over subsequent runs; do not silently conform to stale memory.
- A documented or discovered retry/wait recovered a flake → trigger + retry as `noise`.
- Clarification or runtime check ruled an operation/target unsafe → `guardrail`.
- Verdict confidence was Medium/Low because a specific oracle was missing → the would-have-been oracle as `oracle`.
- Bounded investigation found no e2e surface for a recurring changed-files signature → `negative-pattern`.

# Personalization-strip preprocessing

Tenant memory is shared across every requester for the repo, so each captured insight must be **generalized** before persistence: keep the operational shape, lose the literal per-user value. Generalize, don't drop — anything that genuinely cannot be generalized is dropped, not routed elsewhere.

Apply this preprocessing pass before writing each breadcrumb section:

- Per-user namespaces, personal preview URLs, single-developer fixtures → replace the literal value with a generic placeholder that names its role in the procedure (e.g. the requester's dev namespace, the requester's preview URL).
- Personal local paths (auth fixtures, helper scripts) → keep the procedural intent and replace the literal path with a generic placeholder.
- Display names, emails, Slack handles → rewrite to a generic role reference (the requester, the on-call engineer, the PR author).
- One-off run-specific details that don't recur (this PR's specific log-line, this PR's specific changed file when the insight is not file-bound) → drop from the captured prose; the PR URL anchor is enough.

If the resulting prose no longer expresses a reusable pattern after generalization, the insight was run-specific to begin with — drop the candidate.

# Tenant-safety filter

Strip or drop before writing any breadcrumb section (the secret-redaction skill applies on top, and is binding for credential-shaped content):

- **Secrets** — credentials, API tokens, session cookies, private keys, JWT-shaped strings, or anything the secret-redaction skill bars from external surfaces. Never persisted, even after generalization.
- **Private user details** — display names, emails, Slack handles, other personal identifiers. Generic role references are fine.
- **Per-user namespaces and personal local paths** — only their generalized form is allowed, per the personalization-strip rules above. Literal values are not eligible for shared persistence.
- **Auth retrieval helpers** — safe shared/repo-standard non-secret procedures (helper command names, fixture flow descriptions, doc citations) are eligible; actual credentials, personal browser/profile details, and personal local helper paths are not.

When in doubt, drop.

<include src="kb://skills/memory/feedback-capture.md" />
