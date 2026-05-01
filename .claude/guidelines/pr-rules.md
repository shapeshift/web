## PR-Specific Rules

### PR titles (commitlint)

PR titles are validated by `@commitlint/config-conventional` in `.github/workflows/pr.yml` (commits themselves are not linted).

- **Format**: `type(scope): subject` — e.g. `feat(affiliate-dashboard): ...`, `refactor(public-api): ...`, `fix(swapper): ...`
- **Max length**: 100 characters total for the header (type + scope + subject)
- **Subject case**: the subject must NOT be sentence-case, start-case, PascalCase, or UPPER-CASE. In practice: start the subject with a lowercase word (verb or noun). Embedded proper nouns / acronyms mid-subject are fine (`Chakra UI`, `React Query`, `API`, `SwapperSpecificMetadata`)
- Verify locally before opening / renaming a PR: `printf '%s' "$TITLE" | npx commitlint`

Examples:

- ✅ `refactor(affiliate-dashboard): migrate to Chakra UI + React Query`
- ✅ `feat(public-api): cursor pagination + new affiliate endpoints`
- ❌ `refactor(affiliate-dashboard): Chakra UI migration and React Query` (subject starts with capital → sentence-case)

### xstate PRs

- When a PR includes xstate state machines, the PR description MUST include a Mermaid `stateDiagram-v2` visualization of the machine's states and transitions
- Generate the diagram from the machine definition - show states, events, guards, and error/retry flows
- This serves as living documentation for both product and engineering reviewers
