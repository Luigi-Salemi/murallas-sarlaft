---
name: code-review-phase-output-formats
description: Output-format templates for phased code-review experts — review plan, skipped phase, phase (overview + optional findings), individual finding, pre-recommendation check-in, and final recommendation/summary blocks.
---
# Output formats

Every phase must follow a consistent output structure. Do not deviate from these formats.

## Phase plan

Shown once at the start of the review.

<output_format>
## Review Plan

**Modified files:**
```text
src/
  agents/
    agent_manager.go (modified)
    agent_store.go (modified)
  hooks/
    use_delete_agent.ts (modified)
    use_agent_list.ts (modified)
tests/
  agent_manager_test.go (added)
```

**Running:** Purpose, Risk, Architecture & Design, Correctness & Logic, Tests, Readability & Consistency
**Skipping:** Security — no user input or auth logic in this change
</output_format>

File tree rules:
- Compress single-child directories into one line, e.g. `src/agents/internal/`
- Annotate each file as (added), (modified), or (deleted)
- If the tree exceeds ~15 entries, compress less relevant parts (e.g. tests, generated files, config) into a summary line such as `tests/ (4 files, modified)` and expand only the parts most relevant to the review

## Skipped phase

<output_format>
## [Phase Name]
⏭ Skipped — [one-line reason]
</output_format>

## Phase (discussion and findings)

Every phase follows the same structure:

<output_format>
## [Phase Name]

### Overview
[Explain the most important points for this phase — what you found, what lens you used, what context matters. For discussion phases like Purpose and Architecture, this is 2–4 paragraphs if there's enough to orient on; if there isn't, one paragraph is fine — do not pad. For findings phases, this can be brief if there is nothing meaningful to orient on — one sentence is fine.]

**Here is what you should understand:**
- [point]
- [point]
- [point]
</output_format>

For discussion-only phases (Purpose, Architecture & Design), omit the Findings section. If a phase has no findings, omit the Findings section entirely and move on. If a phase is light and the Overview has nothing meaningful to say beyond the findings themselves, keep the Overview to one sentence and proceed.

If the calling expert is interactive (asks the human engineer between phases), the phase output ends with a permission-to-proceed question (e.g., "Do you have any questions about the above, or should I proceed to the findings?"). The expert's surrounding prose specifies the exact closing line and the stopping rule.

## Individual finding

For interactive reviews that post comments to GitHub, use this format. The expert's surrounding prose specifies the comment header to prepend.

<output_format>
### Finding

**Severity:** BLOCKER | SUGGESTION | NIT

[the comment as it will appear to the PR author. The comment body must be 3–4 sentences maximum: state the issue, explain why it matters, and suggest a fix if you have one. No preamble, no restating context the author already knows from the diff.]

**Your input needed:** [what specific judgment, context, or decision you need from the human engineer. Omit this line entirely if you have full confidence and need no input.]
</output_format>

For non-interactive reviews (e.g., a self-review where findings stay in the conversation), present findings inline as:

<output_format>
**BLOCKER** `path/to/file.ext:N`
[1–2 sentences: what's wrong and what to do about it.]
</output_format>

## Pre-recommendation check-in

<output_format>
## Before My Recommendation

Before I share my recommendation, there are a few points where your input would strengthen the verdict:

- [decision 1 — e.g., "The retry logic in X has no backoff. I'd call this a BLOCKER, but if this path only handles batch jobs, SUGGESTION may be more appropriate. Which is it?"]
- [decision 2 — ...]
- [decision 3 — ...]
</output_format>

## Final recommendation / readiness

For interactive reviewers that post a verdict to GitHub:

<output_format>
## Proposed Verdict: [APPROVE | REQUEST CHANGES | COMMENT]

**Summary:** [2–3 sentence synthesis of the overall review]

**Blockers:** [list, or "None"]
**Suggestions posted:** [list, or "None"]
**Nits posted:** [list, or "None"]

**Reasoning:** [paragraph explaining the verdict]
</output_format>

For self-reviewers that produce a private readiness checklist:

<output_format>
## Readiness: [READY FOR REVIEW | FIX BEFORE REQUESTING REVIEW | NEEDS RETHINKING]

**Summary:** [2–3 sentence synthesis — what this change does well and what still needs attention]

**What reviewers will likely focus on:** [1–2 sentences predicting which parts of the change will draw the most scrutiny]

**Feedback Summary**
- [BLOCKER] `path/to/file.ext:N` — What's wrong and what to do about it.
- [SUGGESTION] `path/to/file.ext:N` — [...]
- [NIT] `path/to/file.ext:N` — [...]
</output_format>

The feedback summary is a flat list sorted by severity (blockers first, then suggestions, then nits). Each item is one line: severity tag, file path, and a one-sentence instruction. Omit severities that have no items.
