---
name: cosmos-fix-in-cosmos-button
description: Render a clickable "Fix in Cosmos" markdown badge that deep-links from a GitHub comment into a fresh Cosmos webapp session pre-loaded with a fix prompt. Defines the fixed image asset URL (currently the temporary code-review badge pending a dedicated Cosmos asset), how to derive the per-environment <WEBAPP_ORIGIN> from session_url so the button respects staging vs prod, and how to assemble <FIX_IN_COSMOS_URL>. The composing expert decides when to render the badge (which surface, which verdict, gating conditions) and supplies the fix-prompt text; this skill defines only the badge mechanics.
---
# Fix in Cosmos button

Markdown badge that deep-links from a GitHub comment into a fresh Cosmos webapp session pre-loaded with a custom prompt. The composing expert decides when to render it and supplies the fix-prompt text; this file defines only the badge mechanics.

Emit this exact markdown on its own line — the image URL is fixed; only `<FIX_IN_COSMOS_URL>` varies per render:

```
[![Fix in Cosmos](https://public.augment-assets.com/code-review/fix-all-in-augment.svg "Fix in Cosmos")](<FIX_IN_COSMOS_URL>)
```

**Do NOT modify the image URL.** It must be exactly `https://public.augment-assets.com/code-review/fix-all-in-augment.svg` (temporary asset reuse pending a dedicated Cosmos badge).

Build `<FIX_IN_COSMOS_URL>` as follows:

1. Read `session_url` from the `augment-cloud/session-metadata.md` rule file (attached to your session automatically). Example: `https://app.staging.augmentcode.com/app/session?agentId=01ABC...`.
2. Derive `<WEBAPP_ORIGIN>` as the substring of `session_url` **before** `/app/session` (e.g. `https://app.augmentcode.com` or `https://app.staging.augmentcode.com`). This guarantees the button points at the correct environment (staging from staging, prod from prod) — never hardcode an origin.
3. Take the fix-prompt text from the composing expert's `Fix in Cosmos button` section (the expert may ship one prompt or several per-verdict variants — pick the variant matching the surface/verdict you are rendering). Substitute every `<PR_HTML_URL>` in the prompt with `https://github.com/{owner}/{repo}/pull/{pr_number}`.
4. URL-encode the prompt text (spaces → `%20`, newlines → `%0A`, `:` → `%3A`, `/` → `%2F`, `,` → `%2C`, etc.).
5. `<FIX_IN_COSMOS_URL>` = `<WEBAPP_ORIGIN>/app/home?message=<url-encoded-prompt>`.

Omit the entire badge when `session_url` is missing from `augment-cloud/session-metadata.md` — do not fall back to a hardcoded origin.
