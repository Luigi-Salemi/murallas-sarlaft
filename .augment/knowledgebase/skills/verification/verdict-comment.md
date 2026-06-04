---
name: verification-verdict-comment
description: Verdict-comment rules for the End-to-End Verifier on GitHub — sentinel, verdict taxonomy, per-check `<details>` proof cards, per-verdict templates, reviewer-accessible-URL contract, POST-per-run / never-PATCH retry rule.
---
# Verdict comment

Always post the verdict to the PR (regardless of which surface launched the session). One fresh POST per verification run — never PATCH a previous verdict comment, because PATCH-edits do not surface as new GitHub notifications and reviewers miss the updated verdict. Older sentinel-marked comments stay on the PR as a historical record; do not edit, delete, or collapse them.

Sentinel — literal HTML comment, **first line** of every verdict comment, so the verifier can recognize its own prior posts during the idempotency check:

```
<!-- e2e-verifier:verdict -->
```

# Composition (fixed order)

1. **Line 1 — sentinel.** Literal `<!-- e2e-verifier:verdict -->`. Self-detection marker for the idempotency check; nothing precedes it.
2. **Line 2 — comment-header.** `<sup>...</sup>` role/session line per `kb://skills/github/comment-header.md`, using the form specified in the verifier's Identity block.
3. **Body.** `## {emoji} {Verdict} — {YYYY-MM-DD}` heading, `Intent`, `Confidence`, per-verdict `**Why …:**` + `**Next action:**` for non-`passed` verdicts, one per-check `<details>` card per validated intent (see **Proof card** below), **one** bottom `<details>` block placed below all cards, then the feedback footer. Do not restate `Intent` under another label (`Proof summary`, `Summary`, `TL;DR`, `Outcome` — the per-check cards carry the takeaway), do not include top-level `**Head:** …` / `**Phases:** …` lines, and do not append a manual `-- End-to-End Verifier` sign-off (the `<sup>` line and GitHub author chrome already attribute it).

# Idempotency

Before heavy work, GET `/repos/{owner}/{repo}/issues/{N}/comments?sort=created&direction=desc&per_page=30` and inspect the **first page only** for the most recent sentinel-marked comment by the same Augment GitHub App — any sentinel-marked comment past that window is by definition older than the 5-minute cooldown. If such a comment exists, was posted within the last 5 minutes, AND the triggering event is **not** a fresh `cosmos verify` (for `issue_comment` triggers: the trigger payload's `comment.id` is not strictly greater than every sentinel comment's `id` on the page; for `pull_request opened/ready_for_review`: any redelivery within 5 min for the same `head.sha`) → post a one-line "already verifying / just verified — see the verdict comment" reply on the originating surface and stop.

This is the **only** case in which a fresh verdict POST is suppressed — it dedupes duplicate webhook deliveries, not legitimate re-verifications. Treat the predicate conservatively: under always-POST, a missed dedup produces a duplicate visible verdict comment **and** a duplicate notification (rather than the silent re-edit the prior PATCH-in-place model produced), so when the trigger's identity is unclear, suppress and surface the one-liner.

A fresh `cosmos verify` comment after the cooldown is always a re-verification request and proceeds normally — it produces a new verdict comment alongside any earlier ones.

# Verdict taxonomy (fixed)

Same one-line phrasing on Slack and the GitHub verdict comment. Verdict appears in the heading. Do **not** introduce other verdicts (no `infra-failed`) or other body markers (no `ui-verifier-results`).

| Verdict | Code | Emoji |
| --- | --- | --- |
| Passed | passed | ✅ |
| Failed | failed | ❌ |
| Skipped | skipped_not_applicable | ⏭️ |
| Unable to Verify | unable_to_verify | ⚠️ |

# Comment body

Reviewer-focused, proof-first.

**Top-level body, in order:**

- Heading + `Intent` + `Confidence`.
- For non-`passed` verdicts, one of `**Why failed:**` / `**Why unable to verify:**` / `**Why skipped:**` followed by `**Next action:**` (omit `Next action` for `skipped_not_applicable` when none applies). For `passed`, no summary-style line follows `Confidence` — go straight to the proof cards.
- **Non-`passed` layout:** wrap `**Next action:**` (first) and `**Why …:**` (second) in a callout — `> [!CAUTION]` for `failed`, `> [!WARNING]` for `unable_to_verify`, `> [!NOTE]` for `skipped_not_applicable`. Render the Fix-in-Cosmos badge on its own line directly below the callout for `failed` / `unable_to_verify` only.
- **Length cap on `**Why …:**` and `**Next action:**` lines** (non-`passed` verdicts): **one sentence per label, ≤2 wrapped lines per label, ≤4 lines total combined**. Keep them scannable — name *what*, not *why-in-detail*; overflow goes in the bottom `<details>` block (as a per-check group entry or a top-level `**Full reasoning:**` bullet). **Exception — `skipped_not_applicable`:** this verdict has no bottom `<details>` block (see the proof-cards / details-block rules below), so the cap is absolute and `**Why skipped:**` must fit on the visible line; if the reason genuinely needs more than one sentence to defend, the verdict is likely not `skipped_not_applicable` — pick `unable_to_verify` instead and use its bottom `<details>` block for the full reasoning.
- Feedback footer (last visible line, outside any `<details>`).

**Proof card (per intent):**

- Each card is a per-check `<details>` block whose `<summary>` is the title line: `<summary><b>Check N — {title}</b> ✅/❌</summary>`. Use HTML tags inside `<summary>` (`<b>`, `<code>`); GitHub does **not** render markdown (`**bold**`, backticks) inside `<summary>` — the asterisks/backticks would render literally. Card body holds the artifact only — nothing else.
- Default state by artifact:

  | Card artifact     | Outer card       | Text body                                                                                                                                |
  | ----------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
  | image / file only | `<details open>` | —                                                                                                                                        |
  | text only         | `<details>`      | in card body                                                                                                                             |
  | image + text      | `<details open>` | inner `<details>` (collapsed) whose `<summary>` names the kind (`stdout / stderr`, `log excerpt`, `request / response`, `test result`, …) |

- **Length cap on text artifacts** (logs, stdout/stderr, request/response, transcripts, raw text): **≤5 lines by default; ≤10 only when fewer cannot prove the verdict** (e.g. a stack trace whose root cause is inseparable from its frames). Trim aggressively — keep only the lines that carry the proof, replace omitted runs with `… (truncated — full output in supporting evidence)`, and put the full content in the bottom `<details>` block. Image embeds, screenshot tables, and test-result rows are not subject to this cap.
- **Multi-case checks** (multiple roles, environments, status codes) may lay artifacts out as a small table in the card body.
- **No prose lines.** No `**Proof:**`, `**Interpretation:**`, `**Comparison:**`, or `**Baseline comparison:** Skipped …` text inside the card. Reviewers see the proof itself, not a paraphrase.

**Bottom `<details>` block (one block, below all cards):**

- `<summary>` is the clickable label only — never wrap hidden content inside `<summary>...</summary>`. Make the label hint at what is inside so reviewers can decide whether to expand (e.g. `Supporting evidence — per-check reasoning and full transcripts`, `Attempted verification — steps tried, full reasoning`).
- Per-check group, in the same order as the cards above:
  - `**What I checked:** {one-line action — surface, command, request, or screen}`.
  - `**Why it proves it:** Artifact shows: {what is observable} — this {confirms / contradicts / is inconclusive for} the expected outcome because {reason}.` Use `Comparison shows: {base behavior} → {PR behavior} — this …` when baseline comparison applies.
  - When baseline comparison was intentionally skipped: `**Baseline comparison:** Skipped — {reason}.`
- After the per-check groups: bulky content — full transcripts, raw stdout/stderr, setup/build logs, fixtures, long YAML/JSON, source-inspection notes, out-of-scope notes, supporting test-suite output, head SHA, per-phase metadata, long signed URLs.
- For `failed` / `unable_to_verify`, include only the **minimal** redacted error/context needed to explain the result — not every command transcript or CI log.
- For `skipped_not_applicable`, omit proof cards and this block entirely; the body is heading + `Intent` + `**Why skipped:**` + footer.
- When the block contains a session link, take `session_url` from `augment-cloud/session-metadata.md`.

# Artifact rendering contract

Applies to every link/embed in the verdict comment, on every surface.

**MUST**

- Use only **reviewer-accessible URLs** — anything another reviewer can open without the triggering expert's session. Default to a hosted artifact (per the cosmos hosted-artifacts skill); switch to another reviewer-accessible URL only if the run requires it. Never link a VFS path or share URL — VFS is not the proof destination.
- **Redact secrets** per the secret-redaction skill before posting and before uploading any hosted artifact — the URL is reviewer-visible by design.
- When baseline comparison applies, present equivalent `Before/Base` and `After/PR` artifacts of the same surface form (UI screenshots, API responses, CLI outputs, log/event excerpts, test outputs).
- If an artifact lives only on local disk, get it to a reviewer-accessible URL before posting. If no such URL can be produced for a required artifact, return `verdict: unable_to_verify` naming the missing artifact rather than posting an inaccessible link.

**PREFER**

- **Markdown image embed** `![alt]({accessible_image_url})` when the URL is directly loadable by GitHub's image proxy (no auth headers required, image content-type). Hosted-artifact URLs and most other signed image URLs qualify.
- **Plain link** `📷 [alt]({accessible_image_url})` when the URL is not directly embeddable (large downloads, viewer-only pages).

**NEVER**

- Embed or link **local file paths, any VFS URL or path, or any URL the reviewer cannot fetch.** Upload to a hosted artifact (or another reviewer-accessible URL) first.

Proof-planning, baseline-comparison decision, and missing-artifact handling live in the expert's prompt.

## {emoji} {Verdict} template (passed / failed / skipped_not_applicable)

<!-- For `skipped_not_applicable`: omit the proof cards and the bottom `<details>` block entirely; the body is heading + `Intent` + `**Why skipped:**` + footer. -->

```md
<!-- e2e-verifier:verdict -->
<sup>[**{Role name}**]({session_url}){role-emoji}</sup>

## {emoji} {Verdict} — {YYYY-MM-DD}

**Intent:** {one sentence}

**Confidence:** {🟢 High / 🟡 Medium / 🔴 Low} — {one phrase reason}

<!-- Non-`passed` only — callout severity: failed `> [!CAUTION]` · unable_to_verify `> [!WARNING]` · skipped_not_applicable `> [!NOTE]`. Pick the matching `**Why …:**` label; omit `**Next action:**` for `skipped_not_applicable` when none applies. -->
<!-- > [!CAUTION] -->
<!-- > **Next action:** {one concrete unblocking step} -->
<!-- > **Why failed:** {one sentence — what proof contradicted the expected outcome} -->
<!-- Hard cap (see `# Comment body`): ≤1 sentence and ≤2 wrapped lines per label; ≤4 lines total across `**Why …:**` + `**Next action:**`. Overflow goes in the bottom `<details>` block. -->
<!-- `skipped_not_applicable` has no `<details>` — cap is absolute; if `**Why skipped:**` cannot fit, switch verdict to `unable_to_verify`. -->

<!-- Fix-in-Cosmos badge on its own line below the callout for `failed` / `unable_to_verify` only — the composing expert supplies the badge mechanics. -->

---

<!-- Each card is wrapped per the **Proof card** rule above; mixed-card example shown (outer open + inner collapsed). -->
<details open>
<summary><b>Check N — {title}</b> ✅/❌</summary>

{image embed or screenshot link}

<details>
<summary>{artifact kind — e.g. <code>stdout / stderr</code>}</summary>

{trimmed fenced block or log excerpt.}

</details>

</details>

<!-- Repeat one card per validated intent. Place the bottom `<details>` block below all cards, never between them. -->

<details>
<summary>Supporting evidence — per-check reasoning and full transcripts</summary>

**Check 1 — {title}**
- **What I checked:** {one-line action}
- **Why it proves it:** Artifact shows: {what is observable} — this {confirms / contradicts / is inconclusive for} the expected outcome because {reason}. (Use `Comparison shows: {base} → {PR} — this …` when baseline comparison applies.)
<!-- Add only when baseline comparison was intentionally skipped: -->
<!-- - **Baseline comparison:** Skipped — {reason}. -->

<!-- Repeat per-check groups in the same order as the cards above. -->

Full stdout/stderr, complete transcripts, setup/build logs, fixtures, long YAML/JSON, source-inspection notes, out-of-scope notes, supporting test-suite output, head SHA, per-phase metadata, long signed URLs.

</details>

{feedback footer — copy verbatim from the `# Feedback footer` rule below}
```

## Surface-specific artifact blocks

Each row is the body of a per-check `<details>` card (artifact only, no prose — see `# Comment body`).

| Surface | Artifact (card body) | Default state |
| --- | --- | --- |
| UI/browser, baseline applies | `Before/Base` + `After/PR` screenshot table. | Open. |
| UI/browser, baseline does not apply | `![After/PR screenshot]({url})`. | Open. |
| API/RPC | Request shape (method, path, redacted body), response status + key fields in a fenced block (≤5 lines, see length cap above). | Collapsed. |
| CLI/TUI | Invoked command (redacted), exit code, key stdout/stderr lines in a fenced block (≤5 lines, see length cap above). Add a terminal screenshot when layout, colors, cursor position, or rendered glyphs carry the proof. | Collapsed. |
| IDE/plugin | Screenshot, plus IDE/plugin/sidecar log/state excerpt. | Mixed (see proof-card rule). |
| Workflow / event / webhook / job | Trigger evidence, downstream state/event id, correlation id, retry/timing summary. | Collapsed. |
| Test evidence | Test name, command, exit/result summary, key assertion output. | Collapsed. |

Wrap each example body below in `<details>` per the proof-card table above.

**UI/browser, baseline applies — example:**

```md
| Before/Base | After/PR |
|---|---|
| ![Before/Base screenshot]({accessible_before_image_url}) | ![After/PR screenshot]({accessible_after_image_url}) |
```

**CLI/TUI — example:**

````md
`$ auggie cloud expert apply -f expert-templates/foo.yaml.template` → exit `0`

```
✓ Applied expert "Foo" (id: <EXPERT_ID>)
```
````

## Unable to Verify template

```md
<!-- e2e-verifier:verdict -->
<sup>[**{Role name}**]({session_url}){role-emoji}</sup>

## ⚠️ Unable to Verify — {YYYY-MM-DD}

**Intent:** {one sentence}

**Confidence:** 🔴 Low — verification could not collect verdict-grade proof

> [!WARNING]
> **Next action:** {one concrete unblocking step — ≤2 wrapped lines}
> **Why unable to verify:** {one sentence naming the missing artifact/path or infra/setup reason — ≤2 wrapped lines}

<!-- Fix-in-Cosmos badge on its own line below the callout — the composing expert supplies the badge mechanics; omit when `session_url` is missing. -->

<!-- Hard cap (see `# Comment body`): visible `**Why unable to verify:**` + `**Next action:**` ≤4 lines combined; overflow goes in the bottom `<details>` block below. -->

<details>
<summary>Attempted verification — steps tried, full reasoning</summary>

- **Attempted:** {short reviewer-safe summary}
- **Stopped at:** {setup/auth/runtime/artifact capture/etc.}
- **Error:** `{minimal redacted stderr/log excerpt if useful}`
<!-- Add when the visible `**Why unable to verify:**` / `**Next action:**` lines had to be trimmed to fit the cap: -->
<!-- - **Full reasoning:** {multi-sentence causal narrative, considered approaches, file/line references, historical comparisons — anything that did not fit on the visible lines.} -->

</details>

{feedback footer — copy verbatim from the `# Feedback footer` rule below}
```

# Feedback footer

Last visible line on every verdict, outside any `<details>` block, exactly: `_To rerun verification, start a PR comment with `cosmos verify`. Optionally add a URL, command, playbook, expected flow, or context to guide the run — reusable guidance is auto-saved to shared verification memory so future runs benefit._`. The `cosmos verify` prefix is required — comments without it may be filtered out before reaching the verifier. The trailing memory-loop clause matches the Slack feedback-invite wording in the verifier prompt's Originating-surface verdict section so the same disclosure reaches reviewers on both surfaces.

# Posting

1. Derive `owner`, `repo`, `issue_number` from the PR URL.
2. POST to `/repos/{owner}/{repo}/issues/{issue_number}/comments` with `{"body": "<verdict body>"}`.

Always POST, even when a prior verdict comment exists. The only case in which a run skips the POST is the 5-minute idempotency cooldown described under `# Idempotency`.

# Retries

On GitHub API failure (auth, rate-limit, network), retry up to 2 times. Still failing → log in the originating-surface message and continue — the originating-surface message is the user-visible verdict; the PR comment is the durable record.
