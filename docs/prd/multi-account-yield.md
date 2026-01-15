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

- /yields list, yields by symbol, and yield-specific pages place the account switcher top-right, matching lending and Fox Ecosystem patterns
- Earn tab already has account selection; no change required
- Enter CTA from account page opens in the account’s context; ensure the modal switcher stays enabled and defaults to the page account
- Asset page entry defaults to the account with the highest actionable (held) balance for that asset

Page-by-Page Notes

- YieldsList/YieldDetail/YieldAssetDetails: no account context passed to balances; add switcher and thread accountId/accountNumber
- YieldEnterModal/YieldForm: use AccountSelector but default to accountNumber=0 when prop missing; must take context or passed accountId
- YieldAssetSection: receives accountId but doesn’t pass accountNumber to modals; fix propagation
- Account/Asset detail pages using YieldAssetSection are outside YieldAccountContext; need accountNumber derived from accountId or provider expansion
- Earn tab: selection exists inside flow; verify alignment with AccountSelector/Dropdown patterns
- Lending/LP/Fox ecosystem: switcher missing; follow top-right pattern if brought under multi-account

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

Acceptance Criteria (Draft)

Feature can be enabled via .env.development

Account switcher works where enabled

Account-specific data updates correctly on switch

No regressions when feature flag is disabled

⬆️ This file is intentionally incomplete.
The spike phase will continuously update it.
