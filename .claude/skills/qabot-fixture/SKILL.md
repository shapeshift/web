---
name: qabot-fixture
description: Create a new qabot E2E test fixture interactively. Guides the user through defining test steps, expected outcomes, and saves the YAML fixture file. Use when user says "create fixture", "new test", "qabot fixture", or "/qabot-fixture".
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# qabot Fixture Builder

You are helping the user create a new E2E test fixture for qabot. Fixtures are YAML files that define test steps for agent-browser to execute.

## Process

### 1. Gather context

Ask the user what they want to test. If they give a vague answer like "test the earn page", ask clarifying questions:
- What specific functionality? (page loads, specific interaction, full flow)
- What route? (e.g., /earn, /trade, /dashboard) - note: the base URL is a run-level arg, not per-fixture
- Does it need a connected wallet? (most tests do - use `depends_on: smoke-test.yaml`)

### 2. Read existing fixtures for reference

```bash
ls e2e/fixtures/*.yaml
```

Read them to understand the established patterns before building a new one.

### 3. Build steps interactively

For each step, ask the user:
- What should the agent do? (this becomes the `instruction`)
- What should be true after? (this becomes the `expected`)

Write instructions in natural language - agent-browser interprets them. No CSS selectors needed.

### 4. Name, describe, and save

Ask for:
- A fixture name (kebab-case for the filename, human-readable for the `name` field)
- A short description of what this fixture tests (one line)

Save to `e2e/fixtures/<name>.yaml`.

## Fixture YAML Format

```yaml
name: Human Readable Name
description: One-line description of what this fixture tests
route: /<route>
depends_on:
  - smoke-test.yaml          # runs BEFORE main steps (wallet unlock, onboarding dismiss)
post_depends_on:
  - evm-chains-regression.yaml  # runs AFTER main steps (optional)
steps:
  - name: Step name
    instruction: >
      Natural language instruction for agent-browser.
      Be specific about what to click, fill, or verify.
      Reference UI elements by their visible text, not selectors.
    expected: What should be true after this step completes
    screenshot: true
```

### Composability

Fixtures can declare dependencies that run before or after the main steps:

- **`depends_on`** - fixtures that run BEFORE the main steps. Most fixtures should include `smoke-test.yaml` which handles onboarding dismiss + wallet unlock.
- **`post_depends_on`** - fixtures that run AFTER all main steps (e.g. regression suites, cleanup).
- Dependencies are resolved recursively and deduplicated (each fixture runs at most once).
- All fixtures run in one browser session - page state carries over.
- Step indices are continuous across all fixtures.

## Guidelines

- Instructions should be specific enough for an AI agent to follow
- Reference UI elements by visible text (e.g., "click the ETH selector", not "click #asset-select")
- For inputs that use React controlled components, note that `press` (char by char) works but `fill` may not trigger onChange
- Every step should have `screenshot: true` so test runs capture visual evidence
- Keep steps atomic - one action per step where possible
- The `expected` field is what the agent checks in the accessibility snapshot to determine pass/fail
