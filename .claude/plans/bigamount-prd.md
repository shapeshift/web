# BigAmount: Full-Stack Integration PRD

## Goal

Eliminate base-unit / precision confusion across the codebase by making BigAmount the canonical way to handle crypto amounts. Selectors return BigAmount instead of separate base-unit and precision strings. Components call `.toBaseUnit()`, `.toPrecision()`, or `.toUserCurrency()` as needed.

## Architecture Decisions (resolved)

| Decision | Resolution |
|----------|-----------|
| Internal storage | **Base units** (integers). `this.value` is always the raw blockchain value. `toPrecision()` divides by `10^precision` at output time. No precision loss at construction. |
| `toBN()` | **Removed.** Not needed — `toPrecision()` gives human-readable, `toBaseUnit()` gives base units. No ambiguous "unwrap" method. |
| Fiat conversion | `bn(amount.toPrecision()).times(price)` or `amount.toUserCurrency()`. `.times(price)` on BigAmount itself is no longer valid (it would multiply base units × price = nonsense). `.times(scalar)` stays for dimensionless scaling (rates, percentages). |
| `convertPrecision()` method | Not needed — two-step `fromBaseUnit → toPrecision → fromPrecision → toBaseUnit` is more explicit |
| Selector approach | Change existing selectors in-place (big bang), not new selectors alongside |
| Fiat in selectors | Fiat/user-currency selectors stay as-is returning strings. Crypto selectors return BigAmount |
| `.toUserCurrency()` location | On BigAmount class via static `configure()` — accepts store resolvers at app init |
| Re-render equality | `selectorCreator: createDeepEqualOutputSelector` on cached BigAmount selectors. `fast-deep-equal` handles BigNumber structurally ✅ (verified) |
| Bulk selectors | `Record<AssetId, BigAmount>` — no more "BaseUnit" in selector names |
| AssetId on BigAmount | Optional — `fromBaseUnit({ value, assetId })` and `fromPrecision({ value, assetId })` resolve precision via configured resolver |
| USD vs user currency | `toUserCurrency()` for user's selected currency (95%+ of codebase). `toUSD()` for raw USD (trade quote protocol fee normalization) |
| PRD location | `.claude/plans/bigamount-prd.md` in repo |
| Configure location | `src/state/store.ts` after store creation |

---

## Phase 0: BigAmount Internal Refactor + API Additions

### 0a. Switch internal storage to base units

**This is a breaking change to BigAmount internals.**

Current: `this.value` stores precision-scale (human-readable).
After: `this.value` stores base units (raw blockchain integers).

```typescript
class BigAmount {
  private readonly value: BigNumber  // NOW: base unit value (e.g., 150000000 for 1.5 BTC)
  readonly precision: number
  readonly assetId?: AssetId

  // Construction
  static fromBaseUnit(args): BigAmount {
    // Just store the value directly — no division
    return new BigAmount(bnOrZero(args.value), precision, assetId)
  }

  static fromPrecision(args): BigAmount {
    // Multiply by 10^precision to convert to base units
    return new BigAmount(bnOrZero(args.value).times(TEN.pow(precision)), precision, assetId)
  }

  // Output
  toBaseUnit(): string {
    return this.value.toFixed(0)  // trivial — just return what we store
  }

  toPrecision(): string {
    return this.value.div(TEN.pow(this.precision)).toFixed()  // divide at output time
  }

  // Formatting (operates on precision-scale)
  toFixed(dp?: number): string {
    const precisionValue = this.value.div(TEN.pow(this.precision))
    return dp !== undefined ? precisionValue.toFixed(dp) : precisionValue.toFixed()
  }

  // Arithmetic (operates on base units — dimensionless scalars only)
  times(scalar: BigNumber.Value): BigAmount {
    return new BigAmount(this.value.times(scalar), this.precision, this.assetId)
  }

  div(scalar: BigNumber.Value): BigAmount {
    return new BigAmount(this.value.div(scalar), this.precision, this.assetId)
  }

  plus(other: BigAmount): BigAmount {
    assertSamePrecision(this, other)
    return new BigAmount(this.value.plus(other.value), this.precision, this.assetId)
  }

  minus(other: BigAmount): BigAmount {
    assertSamePrecision(this, other)
    return new BigAmount(this.value.minus(other.value), this.precision, this.assetId)
  }
}
```

### 0b. Remove `toBN()`

No longer needed. Consumers use:
- `toBaseUnit()` for base unit string
- `toPrecision()` for precision-scale string
- `toUserCurrency()` / `toUSD()` for fiat

### 0c. Fix existing RFOX/TCY/LP consumers

The already-committed consumers (PR #11831) use patterns like:
```typescript
// OLD (precision-scale storage):
BigAmount.fromBaseUnit({ value, precision }).times(price).toFixed(2)

// NEW (base-unit storage):
bn(BigAmount.fromBaseUnit({ value, precision }).toPrecision()).times(price).toFixed(2)
```

And `.toBN()` calls → replace with `.toPrecision()` or explicit conversion.

Files to fix (from PR #11831):
- `useCurrentApyQuery.ts` — `.times(price)` chains → `bn(amount.toPrecision()).times(price)`
- `useLifetimeRewardsQuery.ts` — `.times(price).toBN()` → `bn(amount.toPrecision()).times(price)`
- `TotalStaked.tsx` — `.times(price).toFixed(2)` → `bn(amount.toPrecision()).times(price).toFixed(2)`
- Other RFOX/Fox/TCY/LP files that chain `.times()` with market data prices

### 0d. Optional `assetId` field

BigAmount instances can optionally carry an `assetId`. Used by `toUserCurrency()` and by the `fromBaseUnit({ value, assetId })` overload.

```typescript
class BigAmount {
  readonly assetId?: AssetId
}
```

### 0e. Static `configure()` for store resolver injection

```typescript
type BigAmountConfig = {
  resolvePrecision: (assetId: string) => number
  resolvePrice: (assetId: string) => string
}

class BigAmount {
  private static config?: BigAmountConfig

  static configure(config: BigAmountConfig): void {
    BigAmount.config = config
  }
}
```

### 0f. Union type overloads for `fromBaseUnit` and `fromPrecision`

Both constructors accept either explicit precision OR assetId (which resolves precision via configure):

```typescript
type FromBaseUnitWithPrecision = {
  value: BigNumber.Value | null | undefined
  precision: number
  assetId?: AssetId // optional metadata, doesn't affect precision
}

type FromBaseUnitWithAssetId = {
  value: BigNumber.Value | null | undefined
  assetId: AssetId // precision resolved via configure
}

type FromBaseUnitArgs = FromBaseUnitWithPrecision | FromBaseUnitWithAssetId

static fromBaseUnit(args: FromBaseUnitArgs): BigAmount {
  const precision = 'precision' in args
    ? args.precision
    : BigAmount.config!.resolvePrecision(args.assetId)
  const assetId = args.assetId
  // ... construct with precision and optional assetId
}

// Same union pattern for fromPrecision:
type FromPrecisionWithPrecision = {
  value: BigNumber.Value | null | undefined
  precision: number
  assetId?: AssetId
}

type FromPrecisionWithAssetId = {
  value: BigNumber.Value | null | undefined
  assetId: AssetId
}

static fromPrecision(args: FromPrecisionWithPrecision | FromPrecisionWithAssetId): BigAmount {
  const precision = 'precision' in args
    ? args.precision
    : BigAmount.config!.resolvePrecision(args.assetId)
  const assetId = args.assetId
  // ... construct with precision and optional assetId
}
```

### 0g. `toUserCurrency()` method

```typescript
toUserCurrency(): string {
  if (!this.assetId) throw new Error('BigAmount: toUserCurrency() requires assetId')
  if (!BigAmount.config?.resolvePrice) throw new Error('BigAmount: not configured')
  const price = BigAmount.config.resolvePrice(this.assetId)
  // Convert to precision-scale first, then multiply by price
  return this.value.div(TEN.pow(this.precision)).times(bnOrZero(price)).toFixed(2)
}
```

Returns `string` — fiat has no blockchain precision, and consumers pass strings to `Amount.Fiat`.

### 0h. `toUSD()` method

For the rare case where raw USD price is needed (e.g., trade quote protocol fee normalization in `tradeQuoteSlice/utils.ts`):

```typescript
toUSD(): string {
  if (!this.assetId) throw new Error('BigAmount: toUSD() requires assetId')
  if (!BigAmount.config?.resolvePriceUsd) throw new Error('BigAmount: not configured')
  const priceUsd = BigAmount.config.resolvePriceUsd(this.assetId)
  return this.value.div(TEN.pow(this.precision)).times(bnOrZero(priceUsd)).toFixed(2)
}
```

Add `resolvePriceUsd` to the configure type:

```typescript
type BigAmountConfig = {
  resolvePrecision: (assetId: string) => number
  resolvePrice: (assetId: string) => string       // user currency
  resolvePriceUsd: (assetId: string) => string     // raw USD
}
```

### 0i. Tests

- **Internal storage**: `fromBaseUnit` stores value as-is, `fromPrecision` multiplies by 10^precision
- **Output**: `toBaseUnit()` returns stored value, `toPrecision()` divides by 10^precision
- **Roundtrip**: `fromBaseUnit → toBaseUnit` and `fromPrecision → toPrecision` are identity
- **Arithmetic**: `.times(2)` doubles the amount, `.plus()` / `.minus()` require same precision
- **`toBN()` removed**: no longer exists on BigAmount
- `fromBaseUnit({ value, assetId })` resolves precision via configure
- `fromPrecision({ value, assetId })` resolves precision via configure
- `toUserCurrency()` returns correct fiat value (precision-scale × price)
- `toUserCurrency()` throws without assetId
- `toUserCurrency()` throws without configure
- `toUSD()` returns correct USD value
- `toUSD()` throws without assetId
- `toUSD()` throws without configure
- `fast-deep-equal` structural comparison works for BigAmount instances (base unit BigNumber)
- `toFixed(dp)` operates on precision-scale, not base units
- All 116 existing tests updated to match new internals

### Sanity check
```bash
npx vitest run packages/utils/src/bigAmount
yarn type-check
```

---

## Phase 1: Store Configuration

### 1a. Wire `BigAmount.configure()` in `src/state/store.ts`

```typescript
import { BigAmount } from '@shapeshiftoss/utils'
import { selectAssetById } from './slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from './slices/marketDataSlice/selectors'

// After store creation:
BigAmount.configure({
  resolvePrecision: (assetId: string) => {
    const asset = selectAssetById(store.getState(), assetId as AssetId)
    return asset?.precision ?? 0
  },
  resolvePrice: (assetId: string) => {
    const marketData = selectMarketDataByAssetIdUserCurrency(store.getState(), assetId as AssetId)
    return marketData?.price ?? '0'
  },
  resolvePriceUsd: (assetId: string) => {
    const marketData = selectMarketDataByAssetIdUsd(store.getState(), assetId as AssetId)
    return marketData?.price ?? '0'
  },
})
```

### Sanity check
```bash
yarn type-check
# Boot the app, verify no errors in console
```

---

## Phase 2: Core Selector Unification (`common-selectors.ts`)

The heart of the migration. These 5 selectors change:

### Renames

| Before | After | Returns |
|--------|-------|---------|
| `selectPortfolioAccountBalancesBaseUnit` | `selectPortfolioAccountBalances` | `Record<AccountId, Record<AssetId, BigAmount>>` |
| `selectPortfolioAssetBalancesBaseUnitIncludingZeroBalances` | `selectPortfolioAssetBalancesIncludingZeroBalances` | `Record<AssetId, BigAmount>` |
| `selectPortfolioAssetBalancesBaseUnit` | `selectPortfolioAssetBalances` | `Record<AssetId, BigAmount>` |
| `selectPortfolioCryptoBalanceBaseUnitByFilter` | REMOVED (merged below) | — |
| `selectPortfolioCryptoPrecisionBalanceByFilter` | `selectPortfolioCryptoBalanceByFilter` | `BigAmount` |

### Unified `selectPortfolioCryptoBalanceByFilter`

Replaces BOTH `selectPortfolioCryptoBalanceBaseUnitByFilter` and `selectPortfolioCryptoPrecisionBalanceByFilter`:

```typescript
export const selectPortfolioCryptoBalanceByFilter = createCachedSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assets, accountBalances, assetBalances, accountId, assetId): BigAmount => {
    if (!assetId) return BigAmount.zero({ precision: 0 })
    const asset = assets?.[assetId]
    if (!asset?.precision) return BigAmount.zero({ precision: 0 })

    const balance = accountId
      ? accountBalances?.[accountId]?.[assetId]
      : assetBalances[assetId]

    return balance ?? BigAmount.zero({ precision: asset.precision, assetId })
  },
)({
  keySelector: (_s, filter) => `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`,
  selectorCreator: createDeepEqualOutputSelector,
})
```

### Fiat selectors — internal BigAmount, still return strings

`selectPortfolioUserCurrencyBalances` (and friends) use BigAmount internally but keep returning `string`:

```typescript
// Before:
const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
const assetUserCurrencyBalance = bnOrZero(cryptoValue).times(bnOrZero(price))

// After:
const balance = assetBalances[assetId]  // already BigAmount
const assetUserCurrencyBalance = balance.toBN().times(bnOrZero(price))
```

### Downstream common selectors to update

These selectors in `common-selectors.ts` consume the base selectors and need updating:
- `selectPortfolioUserCurrencyBalances` (L170) — uses `selectPortfolioAssetBalancesBaseUnit`
- `selectPortfolioUserCurrencyBalancesByAccountId` (L279) — uses `selectPortfolioAccountBalancesBaseUnit`
- `selectNetworkFeeUserCurrencyByAssetId` (L216) — uses `selectPortfolioAssetBalancesBaseUnit`
- `selectBalanceIncludingStakingDataCryptoPrecision` (L333) — uses `selectPortfolioAssetBalancesBaseUnit`
- `selectNetworkFeeCryptoBaseUnitByAssetId` (L242) — uses `selectPortfolioAssetBalancesBaseUnit`
- `selectBalanceIncludingStakingDataCryptoBaseUnit` (L367) — uses `selectPortfolioAssetBalancesBaseUnit`

### Sanity check
```bash
yarn type-check  # this will reveal ALL consumer breakages
```

Type errors at this point are expected — they're the migration backlog for Phase 3+.

---

## Phase 3: Portfolio Selector Cascade (`portfolioSlice/selectors.ts`)

Update all portfolio selectors that consume the renamed base selectors:

- `selectPortfolioAccountsHumanBalances` (L445) — currently does `fromBaseUnit` inline → now receives BigAmount, calls `.toPrecision()`
- `selectPortfolioAccountsUserCurrencyBalances` (L460) — similar
- `selectBalanceChartCryptoBalancesByAccountIdAboveThreshold` (L289) — threshold comparison
- `selectPortfolioAssetAccountBalancesSortedUserCurrency` (L342) — sorting by fiat value
- `selectHighestUserCurrencyBalanceAccountByAssetId` (L367)
- `selectPortfolioAllocationPercentByFilter` (L378)
- `selectPortfolioStakingCryptoBalances` (L409)
- `selectUserCurrencyBalanceByFilter` (L521)
- `selectCryptoHumanBalanceFilter` (L529)
- `selectPortfolioAccountRows` (L764)
- `selectAssetEquityItemsByFilter` (L1120) — currently returns both `cryptoAmountBaseUnit` and `amountCryptoPrecision` → returns BigAmount
- `selectEquityTotalBalance` (L1163)

### Sanity check
```bash
yarn type-check
npx vitest run src/state/slices/portfolioSlice/
```

---

## Phase 4: Opportunities Selector Cascade

- `src/state/slices/opportunitiesSlice/selectors/lpSelectors.ts` — uses both base unit selectors
- `src/state/slices/opportunitiesSlice/selectors/stakingSelectors.ts`
- `src/state/slices/opportunitiesSlice/selectors/combined.ts`
- `src/state/slices/opportunitiesSlice/resolvers/foxy/index.ts`
- `src/state/slices/opportunitiesSlice/resolvers/thorchainsavers/index.ts`
- `src/state/slices/opportunitiesSlice/resolvers/ethFoxStaking/index.ts`
- `src/state/slices/opportunitiesSlice/resolvers/cosmosSdk/index.ts`
- `src/state/slices/opportunitiesSlice/resolvers/rFOX/index.ts`

### Sanity check
```bash
yarn type-check
npx vitest run src/state/slices/opportunitiesSlice/
```

---

## Phase 5: Trade Selectors & Helpers

- `src/state/slices/common/tradeInputBase/createTradeInputBaseSelectors.ts` — base unit selector usage
- `src/state/slices/tradeQuoteSlice/selectors.ts`
- `src/state/slices/tradeQuoteSlice/utils.ts` — `convertPrecision` + `priceUsd` usage (the USD edge case)
- `src/state/slices/limitOrderInputSlice/selectors.ts` — uses `convertPrecision`
- `src/state/slices/limitOrderSlice/selectors.ts`
- `src/state/apis/swapper/helpers/validateTradeQuote.ts`
- `src/state/apis/swapper/helpers/getInputOutputRatioFromQuote.ts`

### Sanity check
```bash
yarn type-check
npx vitest run src/state/slices/tradeQuoteSlice/
npx vitest run src/state/slices/limitOrderInputSlice/
```

---

## Phase 6: Consumer Migration — Defi Providers

~20 files across cosmos, foxy, fox-farming, thorchain-savers providers.

**Pattern**: Replace `selectPortfolioCryptoBalanceBaseUnitByFilter` → `selectPortfolioCryptoBalanceByFilter` and call `.toBaseUnit()` or `.toPrecision()` as needed. Remove `fromBaseUnit`/`toBaseUnit` imports.

Files:
- `src/features/defi/providers/cosmos/components/CosmosManager/Deposit/components/Deposit.tsx`
- `src/features/defi/providers/cosmos/components/CosmosManager/Deposit/components/Confirm.tsx`
- `src/features/defi/providers/cosmos/components/CosmosManager/Withdraw/components/Withdraw.tsx`
- `src/features/defi/providers/cosmos/components/CosmosManager/Withdraw/components/Confirm.tsx`
- `src/features/defi/providers/foxy/components/FoxyManager/Deposit/components/Deposit.tsx`
- `src/features/defi/providers/foxy/components/FoxyManager/Deposit/components/Confirm.tsx`
- `src/features/defi/providers/foxy/components/FoxyManager/Withdraw/components/Withdraw.tsx`
- `src/features/defi/providers/foxy/components/FoxyManager/Withdraw/components/Confirm.tsx`
- `src/features/defi/providers/fox-farming/components/FoxFarmingManager/Deposit/components/Deposit.tsx`
- `src/features/defi/providers/fox-farming/components/FoxFarmingManager/Deposit/components/Confirm.tsx`
- `src/features/defi/providers/fox-farming/components/FoxFarmingManager/Withdraw/components/Confirm.tsx`
- `src/features/defi/providers/fox-farming/components/FoxFarmingManager/Claim/ClaimConfirm.tsx`
- `src/features/defi/providers/thorchain-savers/components/ThorchainSaversManager/Deposit/components/Deposit.tsx`
- `src/features/defi/providers/thorchain-savers/components/ThorchainSaversManager/Deposit/components/Confirm.tsx`
- `src/features/defi/providers/thorchain-savers/components/ThorchainSaversManager/Withdraw/components/Withdraw.tsx`
- `src/features/defi/providers/thorchain-savers/components/ThorchainSaversManager/Withdraw/components/Confirm.tsx`
- `src/features/defi/providers/thorchain-savers/components/ThorchainSaversManager/Overview/ThorchainSaversEmpty.tsx`
- `src/features/defi/helpers/utils.ts`

### Sanity check
```bash
yarn type-check
yarn lint --fix
```

---

## Phase 7: Consumer Migration — Trade UI

~15 files across MultiHopTrade, LimitOrder, FiatRamps.

Files:
- `src/components/MultiHopTrade/components/TradeAssetInput.tsx`
- `src/components/MultiHopTrade/components/TradeAmountInput.tsx`
- `src/components/MultiHopTrade/components/Earn/EarnInput.tsx`
- `src/components/MultiHopTrade/components/LimitOrder/components/AllowanceApproval.tsx`
- `src/components/MultiHopTrade/components/LimitOrder/components/LimitOrderCard.tsx`
- `src/components/MultiHopTrade/components/LimitOrder/components/LimitOrderBuyAsset.tsx`
- `src/components/MultiHopTrade/components/LimitOrder/components/LimitOrderConfig.tsx`
- `src/components/MultiHopTrade/components/SharedConfirm/AssetSummaryStep.tsx`
- `src/components/MultiHopTrade/components/TradeConfirm/TradeConfirmFooter.tsx`
- `src/components/MultiHopTrade/components/FiatRamps/FiatRampTradeBody.tsx`
- `src/components/MultiHopTrade/components/FiatRamps/FiatRampQuoteCard.tsx`
- `src/components/MultiHopTrade/components/TradeInput/components/TopAssetCard.tsx`
- `src/components/MultiHopTrade/components/TradeInput/components/TradeQuotes/TradeQuote.tsx`
- `src/components/MultiHopTrade/helpers.ts`
- `src/components/MultiHopTrade/components/LimitOrder/helpers.ts`

### Sanity check
```bash
yarn type-check
yarn lint --fix
```

---

## Phase 8: Consumer Migration — Pages

~25 files across Send, Lending, ThorChainLP, RFOX, Fox, TCY, Yields, Accounts, Markets.

Files:
- `src/components/Modals/Send/hooks/useSendDetails/useSendDetails.tsx`
- `src/pages/Lending/Pool/components/Borrow/BorrowInput.tsx`
- `src/pages/Lending/Pool/components/Repay/RepayInput.tsx`
- `src/pages/ThorChainLP/components/AddLiquidity/AddLiquidityInput.tsx`
- `src/pages/ThorChainLP/components/RemoveLiquidity/RemoveLiquidityInput.tsx`
- `src/pages/TCY/components/Stake/StakeInput.tsx`
- `src/pages/TCY/components/Claim/ClaimConfirm.tsx`
- `src/pages/Yields/components/YieldForm.tsx`
- `src/pages/Yields/components/YieldEnterModal.tsx`
- `src/pages/Yields/components/YieldAvailableToDeposit.tsx`
- `src/pages/Yields/components/YieldsList.tsx`
- `src/pages/RFOX/components/Stake/StakeInput.tsx`
- `src/pages/RFOX/components/Stake/StakeConfirm.tsx`
- `src/pages/RFOX/components/Stake/Bridge/BridgeConfirm.tsx`
- `src/pages/RFOX/components/Unstake/UnstakeInput.tsx`
- `src/pages/Accounts/AccountToken/AccountBalance.tsx`
- `src/pages/Accounts/components/AccountEntryRow.tsx`
- `src/lib/utils/thorchain/balance.ts`

### Sanity check
```bash
yarn type-check
yarn lint --fix
```

---

## Phase 9: Consumer Migration — Components & Remaining

~15 files across Equity, AssetSearch, AssetHeader, WalletConnect, etc.

Files:
- `src/components/Equity/EquityAccountRow.tsx`
- `src/components/AssetSearch/components/AssetRow.tsx`
- `src/components/AssetSearch/components/MarketRow.tsx`
- `src/components/AssetSelection/components/AssetChainDropdown/AssetChainRow.tsx`
- `src/components/AssetHeader/AssetHeader.tsx`
- `src/components/AssetHeader/hooks/useQuickBuy.ts`
- `src/components/ManageHiddenAssets/ManageHiddenAssetsList.tsx`
- `src/components/Layout/Header/ActionCenter/components/ArbitrumBridgeClaimModal.tsx`
- `src/plugins/walletConnectToDapps/components/WalletConnectSigningModal/WalletConnectModalSigningFooter.tsx`
- `src/components/AccountSelector/AccountSelector.tsx`
- `src/components/AccountSelector/AccountSelectorDialog.tsx`

### Sanity check
```bash
yarn type-check
yarn lint --fix
```

---

## Phase 10: `Amount.Crypto` Accepts BigAmount

**File:** `src/components/Amount/Amount.tsx`

```typescript
// Before:
type CryptoAmountProps = {
  value: string | undefined
  symbol: string
  maximumFractionDigits?: number
}

// After:
type CryptoAmountProps = {
  value: string | BigAmount | undefined
  symbol: string
  maximumFractionDigits?: number
}

// Internal:
const resolvedValue = BigAmount.isBigAmount(value) ? value.toPrecision() : value
```

Then simplify consumers that do `.toPrecision()` just to pass to `Amount.Crypto` — they can pass BigAmount directly.

### Sanity check
```bash
yarn type-check
yarn lint --fix
npx vitest run src/components/Amount/
```

---

## Phase 11: Swapper Packages (workspace)

Swapper packages use `fromBaseUnit`/`toBaseUnit`/`convertPrecision` from `@shapeshiftoss/utils`. These don't have store access, so they use explicit precision:

- `packages/swapper/src/thorchain-utils/getL1RateOrQuote.ts` (3 `convertPrecision` calls)
- `packages/swapper/src/thorchain-utils/getThresholdedAffiliateBps/getThresholdedAffiliateBps.ts`
- `packages/swapper/src/swappers/CowSwapper/utils/helpers/helpers.ts`
- `packages/swapper/src/swappers/ZrxSwapper/utils/helpers/helpers.ts`
- `packages/swapper/src/swappers/BebopSwapper/utils/helpers/helpers.ts`
- `packages/swapper/src/swappers/RelaySwapper/utils/getTrade.ts`
- `packages/swapper/src/swappers/StonfiSwapper/utils/helpers.ts`

`convertPrecision` calls become two-step: `BigAmount.fromBaseUnit({ value, precision: input }).toPrecision()` → `BigAmount.fromPrecision({ value: that, precision: output }).toBaseUnit()`.

### Sanity check
```bash
yarn type-check
npx vitest run packages/swapper/
```

---

## Phase 12: Test Migration & Cleanup

- Update test files that use old selector names
- `src/state/slices/portfolioSlice/portfolioSlice.test.ts`
- `src/components/Modals/Send/hooks/useSendDetails/useSendDetails.test.tsx`
- `src/state/slices/tradeQuoteSlice/utils.test.ts`
- `packages/utils/src/bignumber/bignumber.test.ts` (convertPrecision tests → migrate to BigAmount two-step)
- `src/lib/bignumber/bignumber.test.ts` (ditto)
- Remove dead `convertPrecision` export if all usages migrated
- Remove dead `fromBaseUnit`/`toBaseUnit` if fully replaced (or deprecate with JSDoc `@deprecated`)

### Sanity check
```bash
yarn type-check
yarn lint --fix
npx vitest run  # full test suite
```

---

## RALPH Loop Protocol

Each phase follows: **Research → Act → Lint/type-check → Push → Halt (sanity check)**

1. **Research**: Read the files, understand current patterns, plan exact edits
2. **Act**: Make the changes
3. **Lint/type-check**: `yarn type-check && yarn lint --fix`
4. **Push**: Commit with descriptive message — **commit often, never push** (user pushes manually)
5. **Halt**: Verify no regressions, review the diff, sanity check logic correctness

**Commit between each phase.** Commit within phases too if a logical chunk is done. If type-check fails, fix before moving on. Never leave the codebase in a broken state between commits. Never `git push` — that's the user's call.

---

## Summary

| Phase | What | Files | Risk |
|-------|------|-------|------|
| 0 | BigAmount internals (base-unit storage, remove toBN, assetId, configure, toUserCurrency/toUSD) + fix existing consumers | ~25 (class + tests + RFOX/TCY/LP fixes) | **High** — foundational change |
| 1 | Store configuration | 1 (store.ts) | Low |
| 2 | Core selector unification | 1 (common-selectors.ts) | **High** — cascade |
| 3 | Portfolio selector cascade | 1 (portfolioSlice/selectors.ts) | **High** — cascade |
| 4 | Opportunities selectors | ~8 | Medium |
| 5 | Trade selectors & helpers | ~7 | Medium |
| 6 | Defi provider consumers | ~18 | Medium |
| 7 | Trade UI consumers | ~15 | Medium |
| 8 | Page consumers | ~18 | Medium |
| 9 | Component consumers | ~11 | Low |
| 10 | Amount.Crypto accepts BigAmount | ~1 + consumers | Low |
| 11 | Swapper packages | ~7 | Medium |
| 12 | Tests & cleanup | ~5 | Low |
