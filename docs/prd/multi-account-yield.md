PRD: Multi-Account Support for Yield.xyz
Status

Phase: Discovery / Spike

Implementation: NOT STARTED

Feature Flag: Disabled by default

Background

Yield.xyz currently has partial groundwork for multi-account support. Some wiring exists (notably in the Earn tab), but the feature is not fully enabled, consistently wired, or exposed in the UI.

This PRD documents the requirements, UX expectations, and technical approach for enabling full multi-account support behind a feature flag, starting in development environments.

Goals

Enable multi-account support behind a feature flag

Allow users to switch accounts where appropriate

Ensure account-scoped data is consistently fetched, displayed, and mutated

Reuse existing account-switching UX patterns where possible

Non-Goals

Production rollout

Data migration across accounts

Permissioning / role management across accounts (unless already present)

Feature Flag

Name: YieldMultiAccount (base YieldXyz must also be enabled)

Env Vars: VITE_FEATURE_YIELD_MULTI_ACCOUNT (default false), VITE_FEATURE_YIELD_XYZ (default false; enabled in .env.development)

Scope: Route-level gate uses VITE_FEATURE_YIELD_XYZ. Multi-account filtering inside YieldAssetSection depends on VITE_FEATURE_YIELD_MULTI_ACCOUNT and requires accountId from YieldAccountContext (or provided to component).

User Stories

As a user, I can switch between accounts where multi-account is supported.

As a user, when I switch accounts, all account-scoped data updates correctly.

As a developer, I can easily identify where account context is required.

UX Expectations (Initial)

Account switcher should be enabled where currently disabled

Pages that show account-specific data must either:

include an account switcher, or

clearly inherit the active account context

UX should match existing patterns used elsewhere in the app

UX Placement Decisions

- /yields list uses implicit accountNumber context only; no account switcher is shown. Data aggregates across all accounts for list/positions. Context carries the current accountNumber (default 0) but list views aggregate balances across accounts.
- Yield-specific pages (detail/asset detail) use a chain-specific account selector (existing AccountSelector/Dropdown patterns) to pick the accountId for that chain; selector is hidden/disabled when wallet supports only one account for that chain.
- Earn tab already has account selection; no change required.
- Enter CTA from account page opens in the account’s context; ensure the modal selector stays enabled and defaults to the page account.
- Asset page entry defaults to the account with the highest actionable (held) balance for that asset and must surface positions (no regressions from multi-account wiring).

Page-by-Page Notes

- YieldsList: no account switcher. Aggregate balances across all enabled accounts for list + "My Positions" counters. Carry context accountNumber (default 0) but do not filter balances by single account.
- YieldDetail (yield-specific): chain-scoped account selector (AccountSelector/Dropdown) to choose accountId for the yield’s chain. Respect context accountNumber as initial, but allow switching per chain.
- YieldAssetDetails: same as YieldDetail—chain-scoped selector. Must surface positions and stats even when reached from /assets routes.
- YieldEnterModal/YieldForm: accept accountId (preferred) or derive from accountNumber+chainId; no silent default to 0 when missing accountId for the target chain.
- YieldAssetSection: when embedded on account/asset pages, must pass accountId/accountNumber through to modals and not regress positions rendering.
- Earn tab: selection exists inside flow; verify alignment with AccountSelector/Dropdown patterns.
- Lending/LP/Fox ecosystem: unchanged; used as reference for selector placement patterns only.

UX Expectations (Detailed)

- Switcher always available when multiple accounts and feature flag on; disabled when only one account or flag off
- Placement: top-right inline on desktop; mobile can reuse existing AccountSelector responsive styles (no new component)
- Default selection: highest eligible balance for the viewed asset; on account page, default to that page’s account
- Modals/forms inherit the currently selected account; no silent fallback to account 0

Technical Scope (Expanded)

Feature flag wiring: YieldXyz (route gate), YieldMultiAccount (multi-account filtering + selector enablement)

Account identity propagation: AccountId is canonical; accountNumber (BIP44 index) used only for derivation. Require accountId or accountNumber+chainId everywhere yields are fetched or transactions run. Avoid accountNumber=0 defaults.

UI enablement: Add account switcher to yields list/detail/asset flows, matching lending/Fox Ecosystem top-right placement; enable in modals/forms; reuse AccountSelector/AccountDropdown patterns with mobile-friendly props.

Query & API parameter plumbing: All yield queries and tx flows must accept accountId (or accountIds array) and pass to useAllYieldBalances, useYieldTransactionFlow, API calls. Remove silent defaults to account 0.

State management updates: Consider storing selected yield account in context+Redux for persistence; avoid missing accountId by threading through props/hooks; handle enabledAccountIds per wallet.

Data / Identity Model Notes

- Canonical ID: AccountId (CAIP-10). accountNumber is only a derivation index. Conversions live in portfolio selectors: selectAccountIdByAccountNumberAndChainId, selectAccountNumberByAccountId.
- Default selection today: highest balance account per asset (selectHighestUserCurrencyBalanceAccountByAssetId) and mandatory discovery of accountNumber=0. These create implicit single-account assumptions.
- Route params: Yield/Earn routes lack accountId; selection is UI-only. Account pages carry accountId in URL; YieldAssetSection used there must not drop it.

Reusable Patterns & Implementation Notes

- Account selection components: AccountSelector (simple, flag-gated) and AccountDropdown (auto-select highest balance, grouped by accountNumber) are reusable across yield, lending, Fox, and send/earn flows.
- Conversion utilities: selectAccountIdByAccountNumberAndChainId, selectAccountIdsByAccountNumberAndChainId, selectAccountNumberByAccountId, accountIdToLabel, selectPortfolioAccountIdsByAssetIdFilter, selectHighestUserCurrencyBalanceAccountByAssetId.
- Route extraction: useRouteAccountId hook pulls accountId from URL for account/lending routes; proposal is to extend yield routes to carry accountId and hydrate context from query params.
- Discovery: accountNumber=0 is always discovered/enabled; higher indices require activity—multi-account UX must surface selection and avoid hidden defaults.
- Feature-flagged selectors: YieldMultiAccount gates AccountSelector enablement in yield modals/forms; Send flow does not gate.
- Consistency check: At each implementation step, cross-check analogous flows (lending, Fox, send, trade/earn) for UX and data-flow consistency, adapting only when yield domain truly differs.

Current Gaps (expanded)

- YieldsList, YieldDetail, YieldAssetDetails: useAllYieldBalances without account context; must thread accountId/accountNumber and add switcher.
- YieldEnterModal/YieldForm: default accountNumber=0 when prop missing; must take context or derived accountId → accountNumber.
- YieldAssetSection: receives accountId but does not pass accountNumber to modals; propagation fix needed.
- YieldAccountContext scope: wraps only /yields; account/asset pages using YieldAssetSection sit outside—need provider expansion or prop threading from route accountId.
- No yield route param for accountId today; add accountId to routes and rehydrate context/query params; selection stays in context (not Redux).

Risks (updated)

- Hardcoded accountNumber=0 defaults in YieldEnterModal, YieldForm, useYieldTransactionFlow, and YieldAccountContext fallback cause wrong-account operations.
- YieldsList, YieldDetail, YieldAssetDetails call useAllYieldBalances without account context → mixed/incorrect data.
- YieldAssetSection passes accountId but not accountNumber to YieldEnterModal, so modals run on account 0.
- YieldAccountContext wraps only /yields; asset/account pages using YieldAssetSection sit outside, losing context and defaulting to 0.
- accountNumber vs AccountId confusion can cause cross-chain mismatches; conversions need chainId context.
- YieldMultiAccount can be true while YieldXyz false → confusing gate states.

Open Questions

- Any remaining yield components bypassing YieldAccountContext or dropping accountId/accountNumber on the way to queries/txs?
- How to ensure accountNumber edge cases (if accountId is ever missing) are resolved without fallback to 0?

Decisions (current)

- Yield routes should encode accountId for deep links and to prevent context loss; also rehydrate context from query params when present
- Selection stays in context (not Redux); rehydrate from query params where applicable
- YieldAccountContext selection should persist across routes (lives in context)
- Missing accountId is treated as a bug path to fix (no silent fallback)
- Multi-account applies across all chains/providers; single account number in context drives everything
- Asset page default should be the highest eligible (held) balance for that asset
- Reuse existing lending/Fox Ecosystem switcher patterns (desktop and mobile); no new UI paradigm

Risks

- Hardcoded accountNumber=0 defaults (YieldEnterModal, YieldForm, useYieldTransactionFlow, YieldAccountContext fallback) can mis-route actions
- YieldsList, YieldDetail, YieldAssetDetails call useAllYieldBalances without account context → mixed/incorrect data
- YieldAssetSection passes accountId but not accountNumber to YieldEnterModal, so modals run on account 0
- YieldAccountContext wraps only /yields; asset/account pages using YieldAssetSection sit outside and default to 0
- accountNumber vs AccountId confusion can cause cross-chain mismatches; conversions need chainId context
- YieldMultiAccount can be true while YieldXyz false → confusing gate states
- Environment defaults keep both flags false; production enablement requires explicit .env.production changes

Acceptance Criteria (Updated)

- Feature can be enabled via .env.development (VITE_FEATURE_YIELD_XYZ + VITE_FEATURE_YIELD_MULTI_ACCOUNT)
- /yields list shows aggregated balances and positions across all accounts; no account switcher in list view
- Yield detail/asset detail pages show a chain-specific account selector; selector hidden/disabled when only one account is available for that chain
- Account-specific data updates correctly on switch in detail/asset views; context carries accountNumber for defaults
- Asset pages continue to show yield positions (no regression); account pages continue to work
- No regressions when feature flags are disabled

⬆️ This file is intentionally incomplete.
The spike phase will continuously update it.
