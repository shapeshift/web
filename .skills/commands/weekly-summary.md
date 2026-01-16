---
description: Generate weekly PR summary across ShapeShift repositories
---

# Weekly Development Summary Generator

You are generating a weekly development summary for ShapeShift. Your task is to analyze merged and open PRs across multiple repositories and produce **exactly 6 bullet points** summarizing the most significant work from the past week.

## Repositories to Query

Query the following 10 repositories:

1. `shapeshift/web` - Main web application
2. `shapeshift/unchained` - Blockchain indexer
3. `shapeshift/hdwallet` - Hardware wallet library
4. `shapeshift/agentic-chat` - AI chat interface
5. `shapeshift/og` - Open graph/social previews
6. `shapeshift/qa-automate` - QA automation
7. `shapeshift/microservices` - Backend microservices
8. `shapeshift/mobile-app` - Mobile application
9. `shapeshift/website-frontend` - Marketing website
10. `shapeshift/revenue-dashboard` - Revenue analytics

## Execution Steps

### Step 1: Calculate Date Range

Calculate the date from 7 days ago for the query window:

```bash
# macOS
START_DATE=$(date -v-7d +%Y-%m-%d)
# Linux fallback: date -d "7 days ago" +%Y-%m-%d
```

### Step 2: Fetch Merged PRs

For each repository, run:

```bash
gh pr list --repo shapeshift/<repo> --state merged --search "merged:>=$START_DATE" --json number,title,mergedAt,author,labels,body --limit 50
```

Collect all results. Skip repositories that return errors (private/no access).

### Step 3: Fetch Open PRs (Work in Progress)

For each repository, run:

```bash
gh pr list --repo shapeshift/<repo> --state open --json number,title,createdAt,author,labels --limit 20
```

Note significant open PRs that indicate upcoming features.

### Step 4: Check Feature Flag Status (Web Repo Only)

For the `shapeshift/web` repository, determine which features are enabled in production:

1. Read `.env.production` to check `VITE_FEATURE_*` variables
2. Cross-reference with `src/config.ts` for the full list of feature flags
3. Note which merged features are:
   - **Live in production** (flag enabled or no flag needed)
   - **Behind a feature flag** (flag disabled in production)

This is CRITICAL information for stakeholders to understand what users can actually access.

### Step 5: Analyze and Categorize

Group the PRs into these categories:

1. **New Features/Chains** - New blockchain support, new functionality
2. **Bug Fixes** - Resolved issues, error handling improvements
3. **Performance** - Speed improvements, optimization
4. **Infrastructure/DevOps** - CI/CD, deployments, tooling
5. **Mobile/Cross-platform** - Mobile app updates
6. **Testing/QA** - Test coverage, automation

### Step 6: Generate Summary

Produce **exactly 6 bullet points** with the following format:

- Each bullet should be **3-4 sentences** (detailed but concise)
- Include **PR numbers** and **repository names** for reference
- Include **author names** for attribution
- **Clearly state production status** for each item:
  - "(Live in production)" - for features users can access now
  - "(Behind feature flag)" - for features still being tested
  - "(Backend only)" - for infrastructure changes
- Prioritize user-facing changes over internal tooling
- Group related PRs into single bullet points when thematically connected

## Output Format

Output the summary in this exact format:

```markdown
## ShapeShift Weekly Development Summary
**Week of [DATE RANGE]**

- **[Category]: [Title]** - [3-4 sentence description including what was done, which repos/PRs were involved, who contributed, and production status]

- **[Category]: [Title]** - [Description...]

- **[Category]: [Title]** - [Description...]

- **[Category]: [Title]** - [Description...]

- **[Category]: [Title]** - [Description...]

- **[Category]: [Title]** - [Description...]

---
*[X] PRs merged across [Y] repositories | [Z] PRs currently in progress*
```

## Important Notes

1. **Filter out noise**: Exclude automated PRs like "regenerate asset data" unless they introduce new chains/assets
2. **Combine related work**: If multiple PRs address the same feature, combine them into one bullet
3. **Highlight breaking changes**: If any PR introduces breaking changes, call this out explicitly
4. **Note work in progress**: If significant features are open but not merged, mention them briefly at the end
5. **Be specific about production status**: Stakeholders need to know what's actually live vs. coming soon

## Example Bullet Point

> - **New Chain: Tron LP Support** - Added liquidity pool functionality for Tron including TRX and TRC20 token support (web#11615, web#11616 by @gomesalexandre). This enables users to provide liquidity to THORChain pools using Tron assets. (Live in production)

Now execute this workflow and generate the weekly summary.
