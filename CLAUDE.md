# Claude Programming Guidelines

## Global Programming Rules

### Code Quality & Style
- Look for opportunities to use existing code rather than creating new code
- Follow existing code conventions in each file/project
- Use existing libraries and utilities already present in the codebase
- Never assume a library is available - always check imports/package.json first
- Prefer composition over inheritance
- Write self-documenting code with clear variable and function names
- Keep functions small and focused on a single responsibility
- Avoid deep nesting - use early returns instead
- Prefer procedural and easy to understand code
- Avoid useEffect where practical - use it only when necessary and following best practices
- Choose the most straightforward approach that accomplishes the task
- Avoid "any" types - use specific type annotations instead
- For default values with user overrides, use computed values (useMemo) instead of useEffect - pattern: `userSelected ?? smartDefault ?? fallback`
- When function parameters are unused due to interface requirements, refactor the interface or implementation to remove them rather than prefixing with underscore

### Security & Best Practices
- Never expose, log, or commit secrets, API keys, or credentials
- Validate all inputs, especially user inputs
- Use parameterized queries to prevent SQL injection
- Sanitize data before displaying to prevent XSS
- Follow principle of least privilege
- Use HTTPS and secure communication protocols

### Error Handling
- Handle errors gracefully with meaningful messages
- Don't silently catch and ignore exceptions
- Log errors appropriately for debugging
- Provide fallback behavior when possible
- Use proper HTTP status codes in APIs

### Performance
- Avoid premature optimization, but be mindful of performance
- Use appropriate data structures for the task
- Minimize database queries and API calls
- Implement proper caching strategies
- Optimize images and assets for web delivery

### Testing
- Write tests for critical business logic
- Test edge cases and error conditions
- Use descriptive test names that explain behavior
- Keep tests isolated and independent
- Mock external dependencies appropriately

### Documentation & Communication
- Never add code comments unless explicitly requested
- When modifying code, do not add comments that reference previous implementations or explain what changed. Comments should only describe the current logic and functionality.
- Write clear commit messages explaining the "why"
- Use meaningful names for branches, variables, and functions
- Keep README files updated with setup and usage instructions

### Rule Management
- When user says "add that to the project rules": take previous guidance, form a rule, add to project-specific section in CLAUDE.md
- When user says "add that to the global rules": take previous guidance, form a rule, add to global rules section in CLAUDE.md

---

## Project-Specific Rules: ShapeShift

### Project Overview
- **Project**: Decentralized crypto exchange platform
- **Main branch**: `develop` (not main/master)
- **Package manager**: yarn
- **State management**: Redux Toolkit with redux-persist
- **Architecture**: Plugin-based for blockchain support

### Code Quality & Standards
- Always run `yarn lint --fix` and `yarn type-check` after making changes
- Keep changes surgical where possible - minimize changes to make code reviews easier
- Make targeted, focused modifications rather than broad refactors unless specifically requested
- Never create documentation files unless explicitly requested
- Prefer editing existing files over creating new ones
- Memoize aggressively - wrap component variables in `useMemo` and callbacks in `useCallback` where possible
- Avoid `let` variable assignments - prefer `const` with inline IIFE switch statements or extract to functions for conditional logic
- For static JSX icon elements (e.g., `<TbCopy />`) that don't depend on state/props, define them as constants outside the component to avoid re-renders instead of using useMemo

### Git & Version Control
- Never commit changes unless explicitly requested
- When creating commits, follow the Git Safety Protocol (see session notes)
- Main branch is `develop` - use this for PRs
- Branch naming: Use descriptive names (e.g., `feat_gridplus`, `fix_wallet_connect`)

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

**Wallet Integration:**
- Wallets are managed via `WalletProvider` context
- Each wallet has unique `walletId` (e.g., `metamask:0x123`, `ledger:ABC`)
- Portfolio state is filtered by active `walletId`
- Account discovery runs per wallet on connection
