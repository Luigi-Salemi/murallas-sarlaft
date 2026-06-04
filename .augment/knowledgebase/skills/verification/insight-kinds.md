---
name: verification-insight-kinds
description: Catalog of the six insight kinds the End-to-End Verifier captures and consumes — `procedure`, `oracle`, `noise`, `guardrail`, `intent-surface`, `negative-pattern`. Each captured breadcrumb declares one `Kind:`; load-memory uses the kind to load only what each verifier phase needs.
---
# Insight kinds

Every verification breadcrumb declares exactly one `Kind:` from this catalog. Pick the strongest match. If a single insight legitimately covers two kinds, write two breadcrumbs with the same anchor (see **Notes for writers** below); do not collapse them into one.

| Kind | Definition | Example |
| --- | --- | --- |
| `procedure` | Setup/Exercise/Teardown commands or sequences that drove a clean run end-to-end. A `procedure` bullet carrying a complete Setup + Exercise pair may stand in as a plan when the playbook is absent — see the verification plan-selection skill. | "`<deploy command targeting the safe test environment>` then `<e2e test command scoped to the changed feature>`." |
| `oracle` | What success looks like — the concrete observable that proves the intent. | "Request returns HTTP 200 with the resource counter decremented by exactly 1; matching event/log entry appears within 2s." |
| `noise` | Known flakes, false signals, and the safe retry/wait that recovered. | "First request after a fresh deploy returns 503; retry once after 10s." |
| `guardrail` | Operations to refuse, gate, or scope down for safety. | "Never run the destructive reset/seed command against a shared environment — wipes other users' fixtures." |
| `intent-surface` | Where a class of changes manifests observably — links file paths to projects/APIs/UI surfaces. | "Changes under `<changed-component-path>/**` are observable on the matching API endpoint and the related UI section." |
| `negative-pattern` | Changed-files signature that has not been e2e-verifiable in past runs. | "Pure interface/schema-definition changes with no consumer wiring are not e2e-verifiable." |

# Phase → kind load map

`verification-load-memory` filters by `Kind:` to keep each phase's context lean:

| Verifier phase | Kinds to load |
| --- | --- |
| Intake / intent inference | `intent-surface`, `negative-pattern`, `guardrail` |
| Plan selection | `procedure`, `guardrail` |
| Preflight (before Exercise) | `noise`, `guardrail` |
| Exercise / proof execution | `oracle`, `noise`, `guardrail` |
| Verdict composition | `oracle` (for evidence framing), `guardrail` |

`guardrail` loads on every phase because the cost of missing one is unbounded. Other kinds load only where consumed.

# Consumption discipline

Loaded bullets are **hypotheses** that bias this run, not verdicts that gate it. Runtime evidence wins; capture the divergence when memory was wrong. Per-kind:

- `procedure` — try first; on failure, fall through to fresh investigation.
- `oracle` — expected observable; if runtime evidence diverges, the divergence is the new signal.
- `noise` — apply the documented retry/wait **once**, then treat any remaining failure as real.
- `guardrail` — honored within its captured path/context (safety asymmetry: missing a real safety rule has unbounded cost).
- `intent-surface` — additive to the intent inventory's affected-surface field; never narrows it.
- `negative-pattern` — biases bounded plan-selection investigation toward "no e2e surface here"; the run still investigates and the verdict still follows this run's evidence.

# Notes for writers

- One kind per breadcrumb. If a single insight legitimately covers two kinds, write two breadcrumbs with the same anchor — they curate independently and the curate step deduplicates by source weighting.
- Routine `passed` runs reusing the playbook usually produce `procedure` insights that already exist; the curate step merges them into the existing bullet via its source-weighting rules rather than appending a new entry to curated knowledge.
