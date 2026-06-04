---
name: code-review-dedup-policy
description: Dedup policy for a non-interactive code-review agent. Distinguishes prior reviews (do not duplicate) from other bots' general comments (duplicating findings is allowed) and preserves deference to human reviewer feedback.
---
# Dedup policy

- **Do not duplicate findings from prior REVIEWS** — a prior review is
  either a human reviewer's review comment / discussion note, or a
  previous run of this same agent. Identify your prior runs by the
  bold `**ROLE_NAME**` in the comment header (stable across sessions);
  a SESSION_URL match alone only catches the current run.
- **Other bots' general comments are NOT prior reviews.** If you
  independently identify a real issue on a changed line, post the
  inline finding even when a triage / risk-analysis bot or another
  code-review bot has already mentioned it.
- **Defer to human reviewer feedback.** Do not contradict a human
  reviewer unless you have materially new information.
