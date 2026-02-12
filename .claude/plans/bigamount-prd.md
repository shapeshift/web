# Phase 3: Eliminate bnOrZero ceremony — widen BigAmount types & flow

## Context

Phases 1-2 are complete. The codebase still has **1,330 `bnOrZero()` calls** across 275 files.
After deep analysis, many are pure ceremony caused by BigAmount's type signatures being
narrower than its runtime behavior. BigAmount methods already call `bnOrZero()` internally
but their type signatures only accept `BigNumber.Value` (no `null | undefined`).

## Tier 1: Widen BigAmount scalar types (zero runtime change)

### What

Add a `NullableScalar` type alias and widen all scalar-accepting methods in
`packages/utils/src/bigAmount/bigAmount.ts`.

```ts
// New type alias at top of file
type NullableScalar = BigNumber.Value | null | undefined

// Widen these method signatures (implementation unchanged):
times(scalar: NullableScalar): BigAmount
div(scalar: NullableScalar): BigAmount
plus(other: BigAmount | NullableScalar): BigAmount
minus(other: BigAmount | NullableScalar): BigAmount
gt(other: BigAmount | NullableScalar): boolean
gte(other: BigAmount | NullableScalar): boolean
lt(other: BigAmount | NullableScalar): boolean
lte(other: BigAmount | NullableScalar): boolean
eq(other: BigAmount | NullableScalar): boolean
```

### Why

This is the foundation for all subsequent work. Once BigAmount accepts nullable scalars,
callers can write `balance.times(marketData?.price)` instead of
`balance.times(bnOrZero(marketData?.price))`.

### Commit after this step

---

## Tier 2: Strip bnOrZero from BigAmount scalar arguments

### Patterns to transform

**Pattern A: `.times(bnOrZero(x))` → `.times(x)` (~142 instances in 83 files)**
```ts
// Before:
balance.times(bnOrZero(marketData?.price))
// After:
balance.times(marketData?.price)
```

**Pattern B: `.div(bnOrZero(x))` → `.div(x)` (~37 instances in 28 files)**
```ts
// Before:
someAmount.div(bnOrZero(rate))
// After:
someAmount.div(rate)
```

**Pattern C: `.plus(bnOrZero(x))` / `.minus(bnOrZero(x))` / `.gt(bnOrZero(x))` etc**
```ts
// Before:
balance.minus(bnOrZero(estimatedGas)).gte(0)
// After:
balance.minus(estimatedGas).gte(0)
```

### Batches

#### Batch 2A: State/selectors/lib
```
src/state/slices/common-selectors.ts
src/state/slices/portfolioSlice/selectors.ts
src/state/slices/opportunitiesSlice/selectors/*.ts
src/state/slices/opportunitiesSlice/resolvers/**/*.ts
src/state/slices/marketDataSlice/selectors.ts
src/state/slices/limitOrderSlice/*.ts
src/state/slices/tradeQuoteSlice/*.ts
src/state/apis/swapper/helpers/*.ts
src/react-queries/**/*.ts
src/lib/**/*.ts
```

#### Batch 2B: Features/defi
```
src/features/defi/**/*.ts
src/features/defi/**/*.tsx
```

#### Batch 2C: Pages
```
src/pages/RFOX/**
src/pages/TCY/**
src/pages/ThorChainLP/**
src/pages/Lending/**
src/pages/Yields/**
src/pages/Fox/**
src/pages/Markets/**
src/pages/Explore/**
```

#### Batch 2D: Components
```
src/components/MultiHopTrade/**
src/components/Modals/**
src/components/Equity/**
src/components/EarnDashboard/**
src/components/AssetSearch/**
src/components/AssetHeader/**
src/components/StakingVaults/**
src/components/Layout/**
src/components/TransactionHistoryRows/**
```

### Rules for Tier 2
- ONLY strip `bnOrZero()` when the value is passed as a scalar to a BigAmount method
- DO NOT strip `bnOrZero()` when starting a BN chain: `bnOrZero(x).times(y)` where x is NOT BigAmount
- DO NOT strip when the bnOrZero result feeds into BN-specific operations
- If removing bnOrZero leaves an unused import, remove it
- Run `yarn type-check && yarn lint --fix` after each batch
- Commit after each batch

---

## Tier 3: Eliminate standalone bnOrZero chains where BigAmount can replace

### Category A: Double-wrapping anti-patterns (~5 instances)

```ts
// Before:
bnOrZero(bnOrZero(gasPrice).times(gasLimit)).toFixed(0)
// After:
bnOrZero(gasPrice).times(gasLimit).toFixed(0)

// Before:
bnOrZero(bnOrZero(reserves[1].toString()).toString())
// After:
bnOrZero(reserves[1].toString())
```

### Category B: BN chains on values that have known precision (~50+ instances)

Where `bnOrZero(amountString).times(price).toFixed(2)` operates on a value with a known
asset precision, replace with BigAmount:

```ts
// Before:
bnOrZero(cryptoAmount).times(bnOrZero(marketData?.price)).toFixed(2)
// After (when precision is available):
BigAmount.fromPrecision({ value: cryptoAmount, precision: asset.precision })
  .times(marketData?.price).toFixed(2)
```

**Only do this when:**
1. The precision (asset) is available in scope
2. The entire chain produces a display value (.toFixed, .toString, .toNumber)
3. There's no cross-precision mixing

### Category C: bnOrZero(0) → BigAmount.zero (~58 instances)

```ts
// Before:
const total = items.reduce((acc, item) => acc.plus(bnOrZero(item.amount)), bnOrZero(0))
// After (when precision known):
const total = items.reduce(
  (acc, item) => acc.plus(item.amount),
  BigAmount.zero({ precision: asset.precision })
)
```

**Only do this when:**
1. The reducer/accumulator feeds into BigAmount-compatible operations
2. The precision is deterministic in scope

### Category D: Selector return types — string → BigAmount (~20 selectors)

Tighten selectors that always return numeric strings to either:
1. Return `BigAmount` directly (for precision-aware values)
2. Return `string` (not `string | undefined`) when the value is guaranteed

Focus areas:
- `selectPortfolioUserCurrencyBalances` — returns `Record<AssetId, string>`, could be tighter
- Trade input selectors that return amounts with `?? '0'` defaults
- Opportunity selectors that always produce numeric strings

### Batches for Tier 3

Process by file proximity — fix double-wrapping, then BN→BigAmount chains, then selectors.
Each batch should type-check and lint before commit.

---

## Rules (all tiers)

1. **Zero runtime behavior change** for Tier 1
2. **Math equivalence** verified for each transform
3. **Handle nullability** — BigAmount methods handle null/undefined scalars,
   but BigAmount variables themselves need `?? BigAmount.zero({ precision })`
4. **Don't break cross-precision arithmetic** — if different-precision values mix, keep BN
5. **Don't touch `packages/utils/src/bignumber/`** — bnOrZero stays for package consumers
6. **Run `yarn type-check && yarn lint --fix` after each batch**
7. **Commit after each batch**
8. **Never push**

## Verification

```bash
cd /Users/gomes/Sites/shapeshiftWeb--improvement-audit-2
yarn type-check
yarn lint --fix
npx vitest run src/lib/math.test.ts src/lib/amount/BigAmount.test.ts
```
