---
name: cosmos-end-to-end-verifier-fix-prompt
description: Fix-prompt text for the End-to-End Verifier's "Fix in Cosmos" badge — one variant per actionable verdict. Read when composing the badge on a `failed` or `unable_to_verify` verdict.
---
Fix-prompt text — `failed`:

```
The End-to-End Verifier flagged failures on <PR_HTML_URL>. Read the verdict's `Why failed` and `Next action` lines and the proof cards, then help me fix the failing checks. Ask me which to address first before making any changes.
```

Fix-prompt text — `unable_to_verify`:

```
The End-to-End Verifier could not verify <PR_HTML_URL>. Read the verdict's `Why unable to verify` and `Next action` lines, then help me unblock verification. Ask me which approach to try first before making any changes.
```
