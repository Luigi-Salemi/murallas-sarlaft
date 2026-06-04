---
name: github-pr-analytics-reporting
description: Generate efficient GitHub pull-request count reports for repo-wide, explicit-user-list, or GitHub-team scopes.
---
# GitHub PR analytics reporting

Use this when the user asks for GitHub PR trend reporting: total merged PRs by week or month, PRs merged per engineer, team/user comparisons, tables, JSON, CSV, or charts.

## Defaults

- Scope must be one of: repo-wide, explicit GitHub user list, or GitHub team resolved to users.
- If the repo is ambiguous, ask for `OWNER/REPO` before querying.
- If the user wants counts for specific engineers and the engineer list is ambiguous, ask for the exact GitHub logins or the GitHub team to resolve.
- If the time window is ambiguous, ask for it; if the user says "recent" without a range, use the last 12 completed weeks and state that assumption.
- If the bucket granularity is ambiguous, default to weekly counts.
- Weekly trend reports use completed calendar weeks only. Exclude the current in-progress week unless the user explicitly asks for week-to-date or through today.
- Monthly trend reports exclude the current in-progress month unless the user explicitly asks for month-to-date or through today.
- Default metrics:
  - total merged PR count per bucket
  - author-attributed PRs merged per engineer per bucket when the scope is an explicit engineer list or a resolved GitHub team
- Do not compute medians, averages, PR size, or time-to-merge in this skill.

## Scope handling

### Repo-wide

Search without author filters:

```text
repo:OWNER/REPO is:pr is:merged merged:START..END
```

### Explicit user list

Fetch each author separately. Prefer separate author searches because multiple `author:` qualifiers can be interpreted as AND.

```text
repo:OWNER/REPO is:pr is:merged author:LOGIN merged:START..END
```

If the user wants a combined total for the explicit list, sum the per-author counts only after confirming the list is intended to be disjoint individual engineers.

Author filters count only PRs whose GitHub author is the engineer. They do not include bot-authored PRs that were triggered by, requested by, or otherwise attributable to that engineer.

### Bot-authored PRs

When reporting per-engineer counts, explicitly state whether bot-authored PRs are included or excluded. If the user cares about human-triggered bot PRs, ask for the attribution source before querying: for example a bot login, branch-name convention, title/body marker, label, assignee, or other auditable metadata that ties the PR back to a human. Bot PRs are often explicitly attributed via the assignee field.

If the attribution can be represented with GitHub search qualifiers, keep the report count-only and add separate aliases for the bot-attributed counts. If attribution requires inspecting PR bodies, timeline events, comments, commits, or other node-level fields, say that this is outside the count-only `issueCount` workflow and use a richer per-PR workflow instead.

For unresolved bot authorship, include a separate bot/unattributed series rather than silently assigning those PRs to engineers:

```text
repo:OWNER/REPO is:pr is:merged author:BOT_LOGIN merged:START..END
```

### GitHub team

Resolve the team to logins, then run explicit-user-list mode.

1. Ask for organization and team slug if not provided.
2. Fetch all direct members with pagination:
   `GET /orgs/{org}/teams/{team_slug}/members?per_page=100`
3. Do not assume nested teams are included. If the user asks for nested teams, explicitly fetch child teams first if the available GitHub capability permits it; otherwise say nested-team expansion is unsupported.

Private team membership can be invisible to the token. If resolution returns too few or no members, report that as a permissions/scope limitation rather than treating it as an empty team.

## Bucket selection

- Use ISO dates in search qualifiers.
- For weekly reports, build buckets as non-overlapping completed weeks.
- For exact user-supplied ranges that do not align to full weeks, either honor the exact range with partial edge buckets or ask whether to snap to completed weeks; label partial buckets clearly.
- For monthly reports, use non-overlapping calendar months and exclude the current month by default unless the user asks otherwise.
- This skill only supports weekly or monthly buckets. If the user asks for daily or per-PR analysis, say it is outside this skill's default scope.

## Query strategy

Prefer `gh api graphql` via `launch-process` when `gh` is available and authenticated. It streams JSON directly into local scripts, works well for bucketed count reports, and avoids MCP response truncation. Check `command -v gh` and a small authenticated viewer query first.

Fall back to the `github-api` tool when `gh` is unavailable, unauthenticated, or the user explicitly asks for the native tool. In fallback mode, still use GraphQL `search(type: ISSUE)` queries and batch independent aliases where practical.

### Count-only reports

Use GraphQL search aliases with `issueCount`; do not fetch nodes.

```graphql
query {
  w1: search(query: "repo:OWNER/REPO is:pr is:merged merged:2026-01-05..2026-01-11", type: ISSUE) { issueCount }
  w2: search(query: "repo:OWNER/REPO is:pr is:merged merged:2026-01-12..2026-01-18", type: ISSUE) { issueCount }
}
```

Batch many bucket aliases in one GraphQL request when the query remains readable and within API limits. Use distinct aliases and variable names.

For engineer breakdowns, batch one alias per `(bucket, engineer)` pair when practical, for example:

```graphql
query {
  shreynolds_w1: search(query: "repo:OWNER/REPO is:pr is:merged author:shreynolds merged:2026-01-05..2026-01-11", type: ISSUE) { issueCount }
  mtpauly_w1: search(query: "repo:OWNER/REPO is:pr is:merged author:mtpauly merged:2026-01-05..2026-01-11", type: ISSUE) { issueCount }
}
```

Because this skill is count-only, do not fetch PR nodes, additions/deletions, or timestamps beyond what the search qualifier needs.

Run independent buckets/authors concurrently with a bounded worker pool. Keep concurrency modest, usually 4-10 in-flight GitHub requests, and retry transient 502/503/rate-limit responses with backoff.

## Query-size guidance

Count-only reports do not need pagination over PR nodes or bulk PR hydration.

- Prefer `issueCount` over fetching `nodes`.
- Prefer one query alias per bucket for repo totals and one alias per `(bucket, engineer)` for engineer breakdowns.
- Split a very large GraphQL document into multiple requests if the alias count gets unwieldy; merge the returned counts locally.
- Keep repo filters explicit in every query, and keep engineer filters explicit whenever the user asked for per-engineer counts.

## Repo filters

If the user asks for filtering beyond repo and engineer scope, confirm the exact qualifier before querying.

Common safe qualifiers for count reports:

```text
repo:OWNER/REPO is:pr is:merged base:main merged:START..END
repo:OWNER/REPO is:pr is:merged label:"some-label" merged:START..END
repo:OWNER/REPO is:pr is:merged author:LOGIN base:main merged:START..END
```

State the active filters in the final answer.

## Charts

When the user asks for graphs or visual output, render Mermaid charts inline in the session using fenced `mermaid` code blocks.

- For total PR count trends, use a Mermaid `xychart-beta` line chart.
- For per-engineer breakdowns, use a Mermaid `xychart-beta` line chart with grouped series (one series per engineer) or, if the engineer count makes grouping unreadable, render one chart per engineer.
- Label axes clearly: x-axis with time labels and y-axis with "PRs merged".
- Include a title summarizing the scope and date window.
- Keep Mermaid blocks self-contained; do not reference external files.

Always wrap xychart-beta with two directives in this order — a frontmatter config block for sizing, then an %%{init}%% line for the plot color. The entire block must be inside a fenced mermaid code block:

```mermaid
---
config:
    xyChart:
        width: 1400
        height: 500
---
%%{init: {"themeVariables": {"xyChart": {"plotColorPalette": "#0b2545"}}}}%%
xychart-beta
    title "Example: PRs merged per week"
    x-axis ["04-07","04-14","04-21","04-28"]
    y-axis "PRs merged" 0 --> 50
    line [12, 25, 18, 30]
```

Keep x-axis labels short: MM-DD for weekly buckets, YY-MM for monthly.


If the user explicitly asks for JSON or CSV export, you may write that to the VFS.

## Other PR analytics questions

Apply the same scope, date, query, and verification rules to non-standard count questions. Do not force the default chart set if the user asked for a ranked list, comparison, or raw export.

Examples:

- PR counts by week or month for a repo: bucket by the requested period and query `issueCount`
- PR counts by engineer: run per-engineer `author:` searches and present one series per engineer
- PR counts by team: resolve team members, then run the per-engineer searches
- PR counts with label or base-branch filters: add the corresponding qualifier to every bucket query

If the user asks for per-PR detail, PR size, or time-to-merge, say that requires a richer PR analytics workflow than this count-only skill.

## Verification checklist

Before answering, verify and report:

- repo and scope used
- active repo/branch/label filters, if any
- date window and whether current partial period was excluded
- total merged PRs counted
- bucket granularity used: week or month
- whether the report includes per-engineer counts and which engineers were included
- resolved GitHub team members, if team scope was used

If charts were rendered, confirm which Mermaid charts were included in the answer.
