# Phase 1: Migrate `src/` consumers to `fromBaseUnit`/`toBaseUnit` aliases

## Context

`src/lib/math.ts` now exports:
```ts
export const fromBaseUnit = (amount: BigAmount): string => amount.toPrecision()
export const toBaseUnit = (amount: BigAmount): string => amount.toBaseUnit()
```

These are thin aliases over BigAmount methods. The goal is to migrate all `src/` consumers to use these aliases instead of calling `.toPrecision()` / `.toBaseUnit()` directly. This reduces diff noise vs. the pre-BigAmount codebase and keeps API familiar.

## Rules

1. **Migrate**: `.toPrecision()` → `fromBaseUnit(x)`, `.toBaseUnit()` → `toBaseUnit(x)` — when the call is a terminal string extraction (not part of further BigAmount chaining)
2. **DO NOT migrate**: `.toPrecision()` or `.toBaseUnit()` when chained after arithmetic (`.times().toPrecision()`), or when used with `.toFixed(n)`, `.toSignificant(n)`, `.toUserCurrency()`, `.toUSD()`, `.toNumber()`. Those stay as direct BigAmount methods.
3. **DO NOT migrate**: `src/lib/math.ts` itself or `src/lib/amount/BigAmount.test.ts`
4. **Import**: Add `import { fromBaseUnit, toBaseUnit } from '@/lib/math'` where needed. If `fromBaseUnit` or `toBaseUnit` is already imported, reuse.
5. **Remove unused BigAmount import**: If a file no longer directly references `BigAmount` after migration, remove its import. But most files will still need it for construction (`BigAmount.fromBaseUnit({...})`).
6. **Never cast `as BigAmount`**
7. **Commit after each batch**, run `yarn type-check` and `yarn lint --fix` after each batch
8. **Never push** — user pushes manually

## Batch Structure

Process in directory-based batches. Each batch = one commit.

### Batch 1: State selectors & helpers (~15 files)
```
src/state/slices/common-selectors.ts
src/state/slices/portfolioSlice/selectors.ts
src/state/slices/opportunitiesSlice/selectors/lpSelectors.ts
src/state/slices/opportunitiesSlice/selectors/stakingSelectors.ts
src/state/slices/opportunitiesSlice/utils/index.ts
src/state/slices/opportunitiesSlice/resolvers/cosmosSdk/index.ts
src/state/slices/opportunitiesSlice/resolvers/cosmosSdk/utils.ts
src/state/slices/opportunitiesSlice/resolvers/ethFoxStaking/index.ts
src/state/slices/opportunitiesSlice/resolvers/ethFoxStaking/utils.ts
src/state/slices/opportunitiesSlice/resolvers/foxy/index.ts
src/state/slices/opportunitiesSlice/resolvers/rFOX/index.ts
src/state/slices/opportunitiesSlice/resolvers/thorchainsavers/index.ts
src/state/slices/tradeQuoteSlice/selectors.ts
src/state/slices/tradeQuoteSlice/helpers.ts
src/state/slices/tradeQuoteSlice/utils.test.ts
src/state/slices/limitOrderInputSlice/selectors.ts
src/state/slices/limitOrderSlice/selectors.ts
src/state/slices/limitOrderSlice/helpers.ts
src/state/slices/common/tradeInputBase/createTradeInputBaseSelectors.ts
src/state/apis/swapper/helpers/validateTradeQuote.ts
src/state/apis/swapper/helpers/getInputOutputRatioFromQuote.ts
src/react-queries/selectors/index.ts
```

### Batch 2: Defi providers (~30 files)
```
src/features/defi/helpers/utils.ts
src/features/defi/providers/cosmos/components/CosmosManager/**/*.tsx
src/features/defi/providers/foxy/components/FoxyManager/**/*.tsx
src/features/defi/providers/fox-farming/components/FoxFarmingManager/**/*.tsx
src/features/defi/providers/fox-farming/hooks/useFoxFarming.ts
src/features/defi/providers/thorchain-savers/components/ThorchainSaversManager/**/*.tsx
src/features/defi/providers/univ2/hooks/useUniV2LiquidityPool.ts
src/features/defi/providers/univ2/utils.ts
```

### Batch 3: MultiHopTrade & LimitOrder (~20 files)
```
src/components/MultiHopTrade/components/TradeAssetInput.tsx
src/components/MultiHopTrade/components/Earn/EarnInput.tsx
src/components/MultiHopTrade/components/LimitOrder/**/*.tsx
src/components/MultiHopTrade/components/LimitOrderV2/LimitOrderConfirm.tsx
src/components/MultiHopTrade/components/SharedConfirm/AssetSummaryStep.tsx
src/components/MultiHopTrade/components/SpotTradeSuccess/SpotTradeSuccess.tsx
src/components/MultiHopTrade/components/TradeConfirm/**/*.tsx
src/components/MultiHopTrade/components/TradeInput/**/*.tsx
src/components/MultiHopTrade/helpers.ts
src/components/MultiHopTrade/hooks/**/*.ts
src/components/MultiHopTrade/MultiHopTrade.tsx
src/components/MultiHopTrade/StandaloneMultiHopTrade.tsx
src/components/Modals/RateChanged/RateChanged.tsx
```

### Batch 4: Pages — RFOX, TCY, ThorChainLP (~25 files)
```
src/pages/RFOX/components/**/*.tsx
src/pages/RFOX/hooks/**/*.ts
src/pages/TCY/components/**/*.tsx
src/pages/TCY/tcy.tsx
src/pages/ThorChainLP/components/**/*.tsx
src/pages/ThorChainLP/Pool/components/PoolChart.tsx
src/pages/ThorChainLP/queries/hooks/*.ts
```

### Batch 5: Pages — Lending, Yields, Fox, Accounts (~15 files)
```
src/pages/Lending/**/*.tsx
src/pages/Lending/hooks/*.ts
src/pages/Yields/components/**/*.tsx
src/pages/Yields/hooks/*.ts
src/pages/Fox/components/*.tsx
src/pages/Accounts/**/*.tsx
src/pages/TransactionHistory/DownloadButton.tsx
```

### Batch 6: Components & remaining (~25 files)
```
src/components/AccountDropdown/AccountDropdown.tsx
src/components/AccountSelector/**/*.tsx
src/components/Amount/Amount.tsx
src/components/AssetHeader/**/*.ts
src/components/AssetSearch/components/AssetRow.tsx
src/components/AssetSelection/components/AssetChainDropdown/AssetChainRow.tsx
src/components/EarnDashboard/components/PositionDetails/StakingPositionsByProvider.tsx
src/components/Equity/EquityAccountRow.tsx
src/components/Layout/Header/ActionCenter/components/**/*.tsx
src/components/ManageHiddenAssets/ManageHiddenAssetsList.tsx
src/components/Modals/ManageAccounts/components/ImportAccounts.tsx
src/components/Modals/Send/hooks/**/*.tsx
src/components/Sweep.tsx
src/components/TransactionHistoryRows/**/*.tsx
src/plugins/walletConnectToDapps/**/*.tsx
src/hooks/*.ts
src/react-queries/hooks/*.ts
```

### Batch 7: Lib & misc
```
src/lib/address/bip21.ts
src/lib/address/generateReceiveQrText.ts
src/lib/investor/investor-foxy/api/api.ts
src/lib/market-service/foxy/foxy.ts
src/lib/market-service/thorchainAssets/thorchainAssets.ts
src/lib/utils/thorchain/balance.ts
src/lib/utils/thorchain/hooks/useSendThorTx.tsx
src/lib/utils/thorchain/index.ts
src/lib/yieldxyz/executeTransaction.ts
```

## Migration Examples

### Terminal `.toPrecision()` → `fromBaseUnit()`
```ts
// Before:
const amount = balance.toPrecision()
// After:
const amount = fromBaseUnit(balance)

// Before:
const cryptoAmount = BigAmount.fromBaseUnit({ value: baseUnitValue, precision: 18 }).toPrecision()
// After:
const cryptoAmount = fromBaseUnit(BigAmount.fromBaseUnit({ value: baseUnitValue, precision: 18 }))
```

### Terminal `.toBaseUnit()` → `toBaseUnit()`
```ts
// Before:
const raw = balance.toBaseUnit()
// After:
const raw = toBaseUnit(balance)

// Before:
const raw = BigAmount.fromPrecision({ value: amount, precision: 18 }).toBaseUnit()
// After:
const raw = toBaseUnit(BigAmount.fromPrecision({ value: amount, precision: 18 }))
```

### DO NOT migrate (arithmetic chains)
```ts
// Keep as-is — .toPrecision() feeds into further math:
bn(amount.toPrecision()).times(price).toFixed(2)

// Keep as-is — .toFixed(n) is not the same as .toPrecision():
amount.toFixed(8)

// Keep as-is — method chaining:
amount.times(2).toPrecision()
```

## Verification

After all batches:
```bash
yarn type-check
yarn lint --fix
npx vitest run src/lib/math.test.ts
```

Grep checks:
- `rg '\.toPrecision\(\)' src/ --glob '*.{ts,tsx}' -l` — should only show files where `.toPrecision()` is part of a chain (arithmetic, `.toFixed()`, etc.)
- All `src/` imports of `fromBaseUnit`/`toBaseUnit` come from `@/lib/math`
