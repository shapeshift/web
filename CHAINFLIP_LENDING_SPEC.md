# Chainflip Lending Integration - Implementation Spec

## Context

THORChain lending is deprecated (new loans halted Sep 2024). Chainflip lending is live on mainnet with 5 active pools (BTC, ETH, SOL, USDC, USDT) and real liquidity. This epic integrates Chainflip's lending protocol into ShapeShift, starting with supply and building toward full borrow support.

All lending operations use EIP-712 Non-Native Signed Calls on the public State Chain RPC (`rpc.mainnet.chainflip.io`). No SDK exists yet - CF team will improve SDK for us. We keep an `SDK_RESEARCH.md` that tracks pain points and SDK candidates as we build.

GitHub issue: https://github.com/shapeshift/web/issues/11979

## Epic Workflow

- PRs are **stacked** (each branches off the previous)
- Each PR opened as **draft** (NEVER push/open PRs without explicit user approval)
- User reviews code, tests manually, ping-pongs with agent
- Agent only proceeds to next PR when user is happy with current
- `SDK_RESEARCH.md` updated continuously every commit/milestone
- This is a **PoC** - visual work may be thrown away/iterated on

## Design Decisions (locked in)

### Page Structure
- **Top-level tabs** on main lending page: `[Overview | Supply | Borrow]` (like CF's own UI)
- **Overview tab**: global aggregated stats (Total Supplied, Available Liquidity, Total Borrowed) + unified markets table showing both supply APY and borrow columns, "View Market" action
- **Supply tab**: supply-focused stats (Total Supplied, Earned Fees) + markets table with "Supply" buttons
- **Borrow tab**: borrow-focused stats (LTV gauge, borrow power, collateral balance) + markets table with "Borrow" buttons
- **Pool detail page**: per-pool page (`/chainflip-lending/pool/:asset`) with rich stats, your position, action buttons

### Markets Table
- **Three separate row components**: `OverviewMarketRow`, `SupplyMarketRow`, `BorrowMarketRow`
- Each renders columns specific to its tab context
- Pools fetched dynamically from CF RPC at runtime (NOT hardcoded)

### Pool Detail Page
- **2-column layout** on desktop (mobile stacks vertically)
  - Left (scrollable): pool stats (supplied, borrowed, APY, utilisation, interest rate model, LTV/liquidation info). Charts are future scope (need historical data infra).
  - Right (sticky): your position + action buttons
- **Your Position** shows full breakdown: Free Balance, Supplied, Collateral, Earned Interest, Current APY
- Action buttons: `[Supply]` `[Borrow]` `[Deposit to CF]`
- Clicking Supply/Borrow opens **full-page modal** (a la Yields' `YieldForm`)

### Deposit Flow (wallet -> CF State Chain)
- **Separate explicit action** - NOT bundled into supply
- Free balance visible on pool detail page with manual "Deposit to CF" option
- Deposit opens a full-page modal with **linear stepper** showing all steps explicitly:
  1. Enter amount
  2. Sign deposit channel (EIP-712)
  3. Send native tx to channel (wallet tx)
  4. Wait for CF witness (~1-2 min)
  5. Done (free balance updated)

### Supply Flow (CF free balance -> lending pool)
- Supply amount input draws ONLY from State Chain free balance (not wallet balance)
- If free balance insufficient, user is prompted to deposit more first (separate flow)
- Supply modal: linear stepper with EIP-712 sign + confirm
- MIN supply: $100

### Withdraw Flow (lending pool -> CF free balance -> wallet)
- `removeLenderFunds` moves from pool to free balance
- `withdraw_asset` egresses from free balance to on-chain wallet
- Can batch via `Environment.batch` or sequential

### Multi-Account
- Global account switcher (like Yields' `YieldAccountContext`)
- Top-right of page header

### Activity / Tx History
- **Deferred to Action Center PR** (last in epic)
- Per-pool + global activity views
- Runtime tx parsing (research at implementation time)
- Action Center PR also adds toast notifications

### LTV Indicators (Borrow)
- Passive visual indicators using Chakra components
- Threshold markers at 80% (max creation), 85% (topup), 90% (soft liq), 95% (hard liq)
- Future: Action Center adds toast notifications for LTV warnings

### Dynamic Data
- Supported chains/assets fetched from Chainflip RPC dynamically at runtime
- Pool list from `cf_lending_pools()`, NOT hardcoded
- Oracle prices from `cf_oracle_prices()`
- Asset mappings resolved at runtime

---

## PR 1: Infrastructure + Dead Code

Everything behind feature flag. No visible UI beyond an empty page and nav items. All testable with unit tests.

### Dependencies to add (`package.json`)
- `scale-ts@^1.6.1` (~183 KB, zero deps) - SCALE codec
- `@chainflip/extrinsics@^1.6.2` (types only, zero runtime deps) - TypeScript guidance

### Feature Flag: `ChainflipLending`
| File | Change |
|------|--------|
| `src/state/slices/preferencesSlice/preferencesSlice.ts` | Add `ChainflipLending: boolean` to `FeatureFlags` type + initial state |
| `src/config.ts` | Add `VITE_FEATURE_CHAINFLIP_LENDING: bool({ default: false })` + `VITE_CHAINFLIP_RPC_URL: url({ default: 'https://rpc.mainnet.chainflip.io' })` |
| `src/test/mocks/store.ts` | Add `ChainflipLending: false` |
| `.env` | Add `VITE_FEATURE_CHAINFLIP_LENDING=false`, `VITE_CHAINFLIP_RPC_URL=https://rpc.mainnet.chainflip.io` |
| `.env.development` | Add `VITE_FEATURE_CHAINFLIP_LENDING=true` |

### CSP
| File | Change |
|------|--------|
| `headers/csps/chainflip.ts` | Add `'https://rpc.mainnet.chainflip.io'` to `connect-src` |

### Core Library: `src/lib/chainflip/`

| File | Purpose | Complexity |
|------|---------|------------|
| `constants.ts` | CF_RPC_URL, pallet/call indices, asset enum mappings, contract addresses, BLOCKS_TO_EXPIRY (120), CHAINFLIP_SPEC_VERSION (20012) | easy |
| `types.ts` | Types for all RPC responses: pools, config, loans, supply balances, oracle prices, free balances, safe mode, account info, NonNativeCallResult, DepositChannelEvent. Permill/Perbill type aliases. | medium |
| `rpc.ts` | JSON-RPC client (`fetch` + JSON-RPC 2.0 envelope). Typed wrappers: `cfLendingPools()`, `cfLendingConfig()`, `cfLoanAccounts()`, `cfLendingPoolSupplyBalances()`, `cfAccountInfoV2()`, `cfFreeBalances()`, `cfOraclePrices()`, `cfSafeModeStatuses()`, `stateGetRuntimeVersion()`, `cfEncodeNonNativeCall()`, `authorSubmitExtrinsic()` | medium |
| `scale.ts` | SCALE codecs via `scale-ts`. Encoders: `encodeAddLenderFunds`, `encodeRemoveLenderFunds`, `encodeRequestLiquidityDepositAddress`, `encodeWithdrawAsset`, `encodeRegisterLpAccount`, `encodeRegisterLiquidityRefundAddress`, `encodeRequestLoan`, `encodeAddCollateral`, `encodeBatch` (Environment.batch pallet 0x02 call 0x0b, max 10), `encodeNonNativeSignedCall` (outer extrinsic). specVersion guard. | hard |
| `eip712.ts` | EIP-712 pipeline as composable utils: `signChainflipCall({ wallet, accountMetadata, encodedCall, blocksToExpiry?, nonceOrAccount })` -> signed extrinsic hex. Uses `cfEncodeNonNativeCall` -> `adapter.signTypedData` -> `encodeNonNativeSignedCall`. Also `submitSignedCall(hex)` and `signAndSubmitChainflipCall(...)`. Composed utils like `signAddLenderFunds(...)` built on top. | hard |
| `account.ts` | `ethAddressToScAccount(ethAddress)` -> SS58 string (left-pad 20->32 bytes, SS58 encode prefix 2112). `getChainflipAccountStatus()`, `isAccountFunded()`. | medium |

**Signing architecture** (functional composition):
1. `signChainflipCall(...)` - pure util (encode -> sign -> wrap)
2. `signAddLenderFunds(...)` - composed util built on signChainflipCall
3. `useSignAddLenderFunds()` - React mutation hook wrapping the composed util

### Tests: `src/lib/chainflip/*.test.ts`

| File | Scope |
|------|-------|
| `account.test.ts` | Known ETH addr -> SC account mappings from bouncer fixtures |
| `scale.test.ts` | Each encoder against known-good hex output |
| `rpc.test.ts` | Mock fetch, verify JSON-RPC envelope, test typed wrappers |
| `eip712.test.ts` | Mock wallet + RPC, verify encode -> sign -> wrap -> submit pipeline |

### React Query: `src/react-queries/queries/chainflipLending.ts`

Uses `createQueryKeys('chainflipLending', { ... })`. Query factories:

| Query | Calls | staleTime |
|-------|-------|-----------|
| `lendingPools()` | `cfLendingPools()` | 30s |
| `lendingConfig()` | `cfLendingConfig()` | 5min |
| `supplyBalances(scAccount)` | `cfLendingPoolSupplyBalances()` | 30s |
| `freeBalances(scAccount)` | `cfFreeBalances()` | 15s |
| `loanAccounts(scAccount)` | `cfLoanAccounts()` | 15s |
| `oraclePrices()` | `cfOraclePrices()` | 15s |
| `safeModeStatuses()` | `cfSafeModeStatuses()` | 60s |
| `runtimeVersion()` | `stateGetRuntimeVersion()` | Infinity |
| `accountInfo(scAccount)` | `cfAccountInfoV2()` | 30s |

Register in `src/react-queries/index.ts`.

### Navigation + THORChain Rename

| File | Change |
|------|--------|
| `src/Routes/helpers.ts` | Add `isDeprecated?: boolean` to `Route` type |
| `src/Routes/RoutesCommon.tsx` | Rename THORChain lending label to `'navBar.thorchainLending'` + `isDeprecated: true`. Add Chainflip Lending route (`/chainflip-lending/*`, `ChainflipLending` flag). |
| `src/components/Layout/Header/NavBar/MainNavLink.tsx` | Render orange DEPRECATED `Tag` when `isDeprecated` |
| `src/components/Layout/Header/NavBar/NavBar.tsx` | Pass `isDeprecated` prop through |
| `src/components/Layout/Header/NavBar/NavigationDropdown.tsx` | Render DEPRECATED `Badge` in dropdown |
| `src/components/Layout/Header/Header.tsx` | Update earn submenu: add `isDeprecated` to lending, add Chainflip Lending item with `isNew: true` |

### Translation Keys: `src/assets/translations/en/main.json`

- `navBar.thorchainLending`: "THORChain Lending"
- `navBar.chainflipLending`: "Chainflip Lending"
- `common.deprecated`: "Deprecated"
- New `chainflipLending` namespace with all keys (supply, withdraw, pool, status, signing states, error messages)

### Empty Page + SDK Research

| File | Purpose |
|------|---------|
| `src/pages/ChainflipLending/ChainflipLendingPage.tsx` | Minimal page: `<Main><div>TODO</div></Main>`. Lazy-loaded from route. |
| `SDK_RESEARCH.md` (repo root) | Empty living doc: title + purpose + empty sections for pain points, SDK candidates, DX feedback. Updated every commit/milestone. |

### PR 1 Verification
1. `npx vitest run src/lib/chainflip/` - unit tests pass
2. `yarn type-check` - passes
3. `yarn lint --fix` - clean
4. With `VITE_FEATURE_CHAINFLIP_LENDING=true`: nav shows "Chainflip Lending" item, old lending shows "THORChain Lending" + DEPRECATED badge
5. `/chainflip-lending` renders TODO div without crash
6. CSP allows `rpc.mainnet.chainflip.io`

---

## PR 2: Deposit to State Chain + Visual Groundwork

Stacked on PR 1. Brings the page layout, markets table, and deposit-to-state-chain flow.

### Page Layout

| File | Purpose |
|------|---------|
| `src/pages/ChainflipLending/ChainflipLendingPage.tsx` | Real routes: `/` -> Overview (default), `/:tab` -> Supply/Borrow tabs, `/pool/:asset` -> PoolDetail |
| `src/pages/ChainflipLending/components/ChainflipLendingHeader.tsx` | Page header with `[Overview | Supply | Borrow]` tabs, aggregated stats cards, global account switcher |

### Overview Tab

| File | Purpose |
|------|---------|
| `src/pages/ChainflipLending/Overview.tsx` | Global stats (Total Supplied, Available Liquidity, Total Borrowed) + unified markets table |
| `src/pages/ChainflipLending/components/OverviewMarketRow.tsx` | Table row: asset, supply APY, supplied, borrowed, borrow rate, utilisation, "View Market" action |

### Pool Detail Page

| File | Purpose |
|------|---------|
| `src/pages/ChainflipLending/Pool/Pool.tsx` | 2-column layout. Left (scrollable): supply stats, borrow stats, interest model, LTV info. Right (sticky): your position (full breakdown), action buttons. Mobile stacks vertically. |
| `src/pages/ChainflipLending/Pool/components/PoolStats.tsx` | Supply + borrow stats for the pool |
| `src/pages/ChainflipLending/Pool/components/PositionCard.tsx` | Your position: free balance, supplied, collateral, earned interest, current APY. Action buttons: Supply, Borrow, Deposit to CF. |

### Deposit to State Chain Flow

Separate explicit flow (NOT integrated into supply). Full-page modal with linear stepper.

| File | Purpose |
|------|---------|
| `src/pages/ChainflipLending/hooks/useChainflipAccount.ts` | Derives SC account from EVM wallet, checks if funded, returns account status |
| `src/pages/ChainflipLending/hooks/useChainflipPools.ts` | Wraps `lendingPools()` query + oracle prices for fiat display |
| `src/pages/ChainflipLending/hooks/useSignChainflipCall.ts` | React mutation hook wrapping EIP-712 sign pipeline |
| `src/pages/ChainflipLending/Pool/components/Deposit/DepositModal.tsx` | Full-page modal (a la YieldForm) with linear stepper |
| `src/pages/ChainflipLending/Pool/components/Deposit/DepositInput.tsx` | Amount input, wallet balance display, min amount validation |
| `src/pages/ChainflipLending/Pool/components/Deposit/DepositStepper.tsx` | Linear stepper: 1) Enter amount, 2) Sign channel (EIP-712), 3) Send native tx, 4) Wait for witness, 5) Done |

### Account Context

| File | Purpose |
|------|---------|
| `src/pages/ChainflipLending/ChainflipAccountContext.tsx` | Global account selection (like YieldAccountContext). Provides `useChainflipLendingAccount()` hook. |

### PR 2 Verification
1. Type check + lint pass
2. `/chainflip-lending` shows Overview tab with markets table (live mainnet data, dynamically fetched)
3. "View Market" -> pool detail page with 2-column layout
4. With EVM wallet connected: can initiate deposit flow
5. EIP-712 signature popup works
6. Deposit channel opens, native send executes
7. Free balance shows on position card
8. `SDK_RESEARCH.md` updated with deposit channel DX notes

---

## PR 3: Supply Flow

Stacked on PR 2. Moves free balance into lending pools (earn yield) and back out.

### Supply Tab (main page)

| File | Purpose |
|------|---------|
| `src/pages/ChainflipLending/SupplyTab.tsx` | Supply-focused stats (Total Supplied, Earned Fees) + markets table with "Supply" buttons |
| `src/pages/ChainflipLending/components/SupplyMarketRow.tsx` | Table row: asset, supply APY, supplied, borrowed, borrow rate, utilisation, "Supply" action |

### Supply Modal

| File | Purpose |
|------|---------|
| `Pool/components/Supply/SupplyModal.tsx` | Full-page modal with linear stepper |
| `Pool/components/Supply/SupplyInput.tsx` | Amount input (from CF free balance ONLY), APY display, min $100 validation. If insufficient free balance, prompt to deposit first. |
| `Pool/components/Supply/SupplyStepper.tsx` | Steps: 1) Enter amount, 2) Sign EIP-712 (`addLenderFunds`), 3) Confirm (poll `cfLendingPoolSupplyBalances`) |

### Withdraw Modal

| File | Purpose |
|------|---------|
| `Pool/components/Withdraw/WithdrawModal.tsx` | Full-page modal with linear stepper |
| `Pool/components/Withdraw/WithdrawInput.tsx` | Amount input (from supply position), MAX button |
| `Pool/components/Withdraw/WithdrawStepper.tsx` | Steps: 1) Enter amount, 2) Sign `removeLenderFunds` (EIP-712), 3) Sign `withdraw_asset` (EIP-712) OR batch, 4) Confirm egress |

### Hooks

| File | Purpose |
|------|---------|
| `hooks/useChainflipSupplyBalances.ts` | Supply positions + oracle prices for fiat |

### Pool Detail Updates
- `PositionCard.tsx` shows supply positions (not just free balances)
- Supply/Borrow buttons on position card open respective modals

### PR 3 Verification
1. Supply tab on main page shows supply-focused markets table
2. Can supply assets from free balance to lending pool via modal
3. Supply position appears in position card with fiat value
4. Can withdraw (partial/full) back to free balance + egress to wallet
5. Linear stepper shows explicit steps throughout
6. `SDK_RESEARCH.md` updated with supply/withdraw DX notes

---

## PR 4: Borrow Flow

Stacked on PR 3. Full borrow/repay/collateral management.

### Borrow Tab (main page)

| File | Purpose |
|------|---------|
| `src/pages/ChainflipLending/BorrowTab.tsx` | Borrow-focused stats (LTV, borrow power, collateral balance) + markets table with "Borrow" buttons |
| `src/pages/ChainflipLending/components/BorrowMarketRow.tsx` | Table row: asset, borrow rate, available, max LTV, utilisation, "Borrow" action |

### Borrow/Repay/Collateral Modals
- Collateral management: `addCollateral`, `removeCollateral`
- Loan creation: `requestLoan`
- Repayment: `makeRepayment` (partial/full)
- LTV gauge component with passive threshold markers (80/85/90/95%)
- Position card shows loan details (borrowed, collateral, LTV, health)

---

## PR 5: Action Center + Tx History (last in epic)

Separate PR, not stacked on borrow.

- Action Center integration for CF lending operations
- Toast notifications for LTV warnings, deposit confirmations, etc.
- Per-pool activity/history section on pool detail page
- Global CF lending activity view
- Runtime tx parsing (research existing patterns in app at implementation time)

---

## Technical Architecture

### Three Fund Buckets (confirmed: docs, RPC, source)
- **Free balance**: on State Chain, unallocated. Where deposits land. Can be egressed.
- **Collateral**: allocated to back a loan via `add_collateral`
- **Supplied**: allocated to lending pool via `add_lender_funds`
- These are SEPARATE - supplied funds can't be collateral and vice versa

### EIP-712 Pipeline (same for every lending op)
1. SCALE-encode the call (e.g. `addLenderFunds`)
2. `cf_encode_non_native_call(hexCall, blocksToExpiry=120, nonceOrAccount, {Eth:'Eip712'})` on public RPC
3. User signs EIP-712 TypedData with `eth_signTypedData_v4`
4. Submit via `author_submitExtrinsic` wrapping `environment.nonNativeSignedCall`

### Batching
- `Environment.batch` (pallet 0x02, call 0x0b), NOT `utility.batch`
- Max 10 calls per batch, no nesting
- Cross-pallet batching works

### Key Constants
- FLIP ERC-20: `0x826180541412d574cf1336d22c0c0a287822678a`
- State Chain Gateway: `0x6995ab7c4d7f4b03f467cf4c8e920427d9621dbd`
- SS58 prefix: 2112
- specVersion: 20012 (signatures invalid after runtime upgrade)
- LTV thresholds: 80% max creation, 85% topup, 88% soft liq abort, 90% soft liq, 93% hard liq abort, 95% hard liq
- Interest model: 0% at 0% util, 4% at 95% util (kink), 25% at 100% util
- Minimums: $100 supply/loan creation, $10 loan/collateral update

### Nonce Behavior
- `NonceOrAccount`: number -> Nonce(u32), SS58 string -> Account(AccountId32). Hex strings do NOT work.
- Account MUST exist before submission (FLIP funding creates it)
- nonce=0 works for first call after funding
- Future nonces allowed (queue in txpool)

### Account Creation (PoC - direct path)
1. Derive SC account from ETH address (deterministic)
2. User needs FLIP ERC-20, calls `fundStateChainAccount` on State Chain Gateway
3. Submit `registerLpAccount()` via non-native signed call
4. Submit `register_liquidity_refund_address` per chain
- Broker path (better UX) blocked on BaaS not exposing `request_account_creation_deposit_address`

## Critical Reference Files

| Purpose | File |
|---------|------|
| EIP-712 signing pattern | `src/components/MultiHopTrade/components/TradeConfirm/hooks/useSignPermit2.tsx` |
| CowSwap EIP-712 | `packages/swapper/src/cowswap-utils/index.ts` |
| Yield form (full-page modal) | `src/pages/Yields/components/YieldForm.tsx` |
| Yield account context | `src/pages/Yields/YieldAccountContext.tsx` |
| Linear stepper | `src/pages/Yields/components/TransactionStepsList.tsx` |
| React Query keys | `src/react-queries/queries/common.ts` |
| Feature flag pattern | `src/state/slices/preferencesSlice/preferencesSlice.ts` |
| Route config | `src/Routes/RoutesCommon.tsx` |
| Nav badges | `src/components/Layout/Header/NavBar/MainNavLink.tsx` |
| Earn submenu | `src/components/Layout/Header/Header.tsx` |
| CF swapper asset mappings | `packages/swapper/src/swappers/ChainflipSwapper/constants.ts` |
| CF asset resolution | `packages/swapper/src/swappers/ChainflipSwapper/utils/helpers.ts` |
| THORChain lending (old) | `src/pages/Lending/` |

## Risk

- **PR 1**: Low. Dead code behind flag. Nav rename is cosmetic.
- **PR 2**: Medium. New on-chain tx paths (EIP-712 + deposit channels). Isolated behind flag.
- **PR 3**: Medium. Moves real funds into lending pools. Behind flag.
- **PR 4**: Medium-High. Full loan lifecycle. Behind flag.
- **PR 5**: Low. UI-only (action center + history). Behind flag.

Hardest parts: SCALE encoding correctness (byte-perfect pallet/call indices), EIP-712 pipeline (multi-step async with wallet interaction), deposit channel flow (open -> send -> detect -> confirm).
