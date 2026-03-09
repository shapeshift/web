## Project-Specific Rules: ShapeShift

### Project Overview
- **Project**: Decentralized crypto exchange platform
- **Main branch**: `develop` (not main/master)
- **Package manager**: pnpm
- **State management**: Redux Toolkit with redux-persist
- **Architecture**: Plugin-based for blockchain support

### Code Quality & Standards
- Always run `pnpm run lint --fix` and `pnpm run type-check` after making changes
- Keep changes surgical where possible - minimize changes to make code reviews easier
- Make targeted, focused modifications rather than broad refactors unless specifically requested
- Never create documentation files unless explicitly requested
- Prefer editing existing files over creating new ones
- Memoize aggressively - wrap component variables in `useMemo` and callbacks in `useCallback` where possible
- Avoid `let` variable assignments - prefer `const` with inline IIFE switch statements or extract to functions for conditional logic
- For static JSX icon elements (e.g., `<TbCopy />`) that don't depend on state/props, define them as constants outside the component to avoid re-renders instead of using useMemo

### CLI Tool Preferences
- Prefer `rg` (ripgrep) over `grep` for searching - it's faster and respects .gitignore
- Use `jq` for querying and manipulating JSON files instead of reading entire files into context
  - Example: `jq '.yieldXYZ | keys' src/assets/translations/en/main.json` to list keys
  - Example: `jq '.someKey.nested' file.json` to extract specific values
- This is especially important for large JSON files (like generated data or translation files) to avoid context bloat and improve performance

### Git & Version Control
- Never commit changes unless explicitly requested
- When creating commits, follow the Git Safety Protocol (see session notes)
- **Before pushing**: always run `pnpm run lint --fix`, and if there are lint fixes, commit them before pushing. Never push without verifying lint passes first.
- Main branch is `develop` - use this for PRs
- Branch naming: Use descriptive names (e.g., `feat_gridplus`, `fix_wallet_connect`)
- When opening PRs (via `gh`, Aviator `av`, or any CLI tool), ALWAYS use the `.github/PULL_REQUEST_TEMPLATE.md` template as the base for the PR body
- **Editing PR descriptions**: `gh pr edit --body` fails on this repo due to a deprecated Projects Classic GraphQL error. Use the REST API instead: `gh api repos/shapeshift/web/pulls/<number> -X PATCH -F "body=@/path/to/body.md"` (write the body to a temp file first)

### UI/UX Standards
- Account for light/dark mode using `useColorModeValue` hook
- Account for responsive mobile designs in all UI components
- When applying styles, use the existing standards and conventions of the codebase
- Use Chakra UI components and conventions

### Internationalization (i18n)
- All copy/text must use translation keys - never hardcode strings
- Add English copy to `src/assets/translations/en/main.json` (find appropriate section)
- Ignore other language translation files - only update English
- Use the translation hook: `useTranslate()` from `react-polyglot`
- **Both steps required**: Translations must be (1) added to `en/main.json` AND (2) consumed via `translate('key')` - missing either step results in untranslated strings showing raw keys

### Feature Flags
- Feature flags are stored in Redux state under `preferences.featureFlags`
- Feature flags are NOT persisted between sessions (blacklisted in redux-persist)
- Default values always come from environment variables prefixed with `VITE_FEATURE_`

**To add a new feature flag:**
1. Add to `FeatureFlags` type in `src/state/slices/preferencesSlice/preferencesSlice.ts`
2. Add environment variable validation in `src/config.ts` (e.g., `VITE_FEATURE_MY_FLAG: bool({ default: false })`)
3. Add to initial state in `preferencesSlice.ts` (e.g., `MyFlag: getConfig().VITE_FEATURE_MY_FLAG`)
4. Add to test mock in `src/test/mocks/store.ts`
5. Set appropriate values in `.env`, `.env.development`, and `.env.production`

**Usage:**
- Use `useFeatureFlag('FlagName')` hook to access feature flag values in components
- The `/flags` route provides a hidden UI for toggling feature flags at runtime (click settings modal header 5 times)
- Use `.env.development` for dev-only features and `.env.production` for prod settings

### Redux State Management
- Uses Redux Toolkit with createSlice
- State is persisted with redux-persist (localforage)
- Migrations are required when changing persisted state structure (see `src/state/migrations/`)
- When adding new slices:
  1. Create slice in `src/state/slices/<sliceName>/`
  2. Add to `src/state/reducer.ts` (both `slices` and `sliceReducers`)
  3. Add to `src/state/store.ts` `clearState()` function
  4. Add persist config if needed
  5. Export selectors from slice using `selectors` property

### Contracts (Enforceable Integration Specs)

Contracts live in `.claude/contracts/` (project) and `~/.claude/contracts/` (global, fallback).
They define the authoritative checklist of integration points for a feature type.

**When building:** If a contract exists for the feature type being implemented, load it
and use it as your todo list. Every item must be addressed.

**When reviewing:** If a contract exists for the feature type being reviewed, load it
and perform gap analysis against the PR diff. Flag missing items with severity prefixes.

**Discovery:** Check `.claude/contracts/` first, then `~/.claude/contracts/`.

Current contracts:
- `second-class-evm-chain.md` - All integration points for adding a new second-class EVM chain
- `swapper-integration.md` - Registration, testing, and completion checklist for new swappers

### Type Definitions
- Prefer `type` over `interface` for type definitions
- Use strict typing - avoid `any`
- Use `Nominal` types for domain identifiers (e.g., `WalletId`, `AccountId`)
- Import types from `@shapeshiftoss/caip` for chain/account/asset IDs

### Common Patterns

**Selectors:**
- Use `createDeepEqualOutputSelector` from `@/state/selector-utils` for deep equality checks
- Use `createCachedSelector` from `re-reselect` for parameterized selectors
- Export selectors from slice using inline `selectors` property

**Components:**
- Use `useAppSelector` for Redux state
- Use `useAppDispatch` for Redux actions
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback`

**BigAmount (Precision-Aware Numeric Type):**
- See `docs/bigamount.md` for full API documentation
- Use `BigAmount.fromBaseUnit({ value, precision })` for constructing from raw blockchain values (preferred, lossless)
- Use `BigAmount.fromPrecision({ value, precision })` only when a precision-scale value is all that's available
- Call `.toPrecision()` / `.toBaseUnit()` directly on BigAmount for string extraction — no wrapper aliases
- Never cast `as BigAmount` — fix types as needed
- Naming: `CryptoBaseUnit` = raw integer, `CryptoPrecision` = human-readable (NOT "HumanBalance")

**Wallet Integration:**
- Wallets are managed via `WalletProvider` context
- Each wallet has unique `walletId` (e.g., `metamask:0x123`, `ledger:ABC`)
- Portfolio state is filtered by active `walletId`
- Account discovery runs per wallet on connection

### Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
