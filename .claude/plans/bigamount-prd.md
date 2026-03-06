# Phase 4: Eliminate fromBaseUnit/toBaseUnit aliases, tests, JSDoc, vernacular, docs

## Status: NOT STARTED

## Context

Phases 1-3 are complete. The codebase has `fromBaseUnit`/`toBaseUnit` aliases in `src/lib/math.ts`
with two overloads each (BigAmount and positional args). Decision: **eliminate both aliases entirely**.
Callers use `.toPrecision()`/`.toBaseUnit()` directly on BigAmount. Push BigAmount upstream where
natural, construct inline elsewhere.

**Call site counts:**
- `fromBaseUnit` — 137 files, 435 calls (325 positional, 110 BigAmount)
- `toBaseUnit` — 59 files, 224 calls (98 positional, 126 BigAmount)
- Direct `.toPrecision()` — 65 calls, 32 files
- Direct `.toBaseUnit()` — 13 calls, 8 files
- Total to migrate: ~659 alias calls across ~167 files

**Vernacular:** 82+ occurrences of "Human" in balance/amount naming (selectors, variables, types).
51 are actually CryptoPrecision → rename. 30+ are genuine display-level → keep.

---

## Phase 0: Safety Net — Package-level BigAmount tests + JSDoc

### Tests

Create `packages/utils/src/bigAmount/bigAmount.test.ts` with comprehensive coverage:

- **Construction**: `fromBaseUnit`, `fromPrecision`, `fromBN`, `fromThorBaseUnit`, `fromJSON`, `zero`
- **Output**: `.toPrecision()`, `.toBaseUnit()`, `.toFixed()`, `.toSignificant()`, `.toNumber()`, `.toBN()`, `.toJSON()`
- **Fiat output**: `.toUserCurrency()`, `.toUSD()` (with configure mock)
- **Arithmetic**: `.plus()`, `.minus()`, `.times()`, `.div()`, `.abs()`, `.negated()`, `.positiveOrZero()`, `.decimalPlaces()`
- **Comparisons**: `.gt()`, `.lt()`, `.gte()`, `.lte()`, `.eq()`
- **Boolean**: `.isZero()`, `.isPositive()`, `.isNegative()`, `.isFinite()`
- **Static**: `BigAmount.min()`, `BigAmount.max()`, `BigAmount.isBigAmount()`
- **Edge cases**: null/undefined scalars, cross-precision arithmetic errors, precision 0, large values, negative values
- **NullableScalar**: verify `.times(null)`, `.div(undefined)`, `.plus(null)` all work

Remove `src/lib/amount/BigAmount.test.ts` (move useful cases to package-level test).

### JSDoc

Add brief JSDoc to all public methods and static factories in `packages/utils/src/bigAmount/bigAmount.ts`:

```ts
/** Create from base-unit (raw blockchain) value. Preferred — lossless. */
static fromBaseUnit(opts: FromBaseUnitWithPrecision | FromBaseUnitWithAssetId): BigAmount

/** Create from precision-scale (human-readable) value. Use only when base unit is unavailable. */
static fromPrecision(opts: ...): BigAmount

/** Precision-scale string (human-readable). E.g. "1.5" for 1500000000000000000 at precision 18. */
toPrecision(): string

/** Base-unit string (raw integer). E.g. "1500000000000000000" for 1.5 ETH. */
toBaseUnit(): string
```

Keep JSDoc brief — one line per method, no `@param`/`@returns` unless non-obvious.

### Commit after this step

---

## Phase 1: Double-conversion fixes

Fix 12+ anti-patterns where BigAmount is extracted to string then re-wrapped in BN.

### Pattern A: `bn(bigAmount.toBaseUnit())` → use BigAmount arithmetic

```ts
// Before:
bn(balanceCryptoBaseUnit.toBaseUnit()).minus(someOtherValue)
// After (if other value is base-unit):
balanceCryptoBaseUnit.minus(someOtherValue)
// After (if need BN result):
balanceCryptoBaseUnit.toBN()
```

### Files to fix

1. `src/state/apis/swapper/helpers/validateTradeQuote.ts` (lines 246, 252, 212)
2. `src/state/slices/opportunitiesSlice/selectors/lpSelectors.ts` (lines 64, 107-108)
3. `src/state/apis/swapper/helpers/getInputOutputRatioFromQuote.ts` (lines 32-39, 90-97)
4. `src/state/slices/tradeQuoteSlice/helpers.ts` (lines 35-42)
5. `src/features/defi/providers/thorchain-savers/.../Deposit/Confirm.tsx` (lines 222, 239, 249)
6. `src/features/defi/providers/thorchain-savers/.../Withdraw/Confirm.tsx` (line 424)
7. `src/pages/ThorChainLP/components/RemoveLiquidity/RemoveLiquidityInput.tsx` (line 494)

### Rules
- If the downstream needs a BN, use `.toBN()` instead of `bn(bigAmount.toPrecision())`
- If the downstream does arithmetic, keep it in BigAmount
- If the downstream needs a string, just call `.toPrecision()` or `.toBaseUnit()`
- Run `yarn type-check && yarn lint --fix` after each sub-batch
- Commit after all double-conversions are fixed

---

## Phase 2: Migrate fromBaseUnit callers (325 positional + 110 BigAmount calls)

Eliminate ALL `fromBaseUnit()` calls from `src/`. Replace with direct BigAmount methods.

### Positional args pattern

```ts
// Before:
fromBaseUnit(someValue, precision)
// After:
BigAmount.fromBaseUnit({ value: someValue, precision }).toPrecision()
```

If `assetId` is available in scope and precision isn't, use the assetId overload:
```ts
BigAmount.fromBaseUnit({ value: someValue, assetId }).toPrecision()
```

### BigAmount overload pattern

```ts
// Before:
fromBaseUnit(someBigAmount)
// After:
someBigAmount.toPrecision()
```

### Migration order (by directory)

#### Batch 2A: state/ (~73 calls)
```
src/state/slices/common-selectors.ts
src/state/slices/portfolioSlice/selectors.ts
src/state/slices/opportunitiesSlice/**
src/state/slices/tradeQuoteSlice/**
src/state/apis/**
src/react-queries/**
```

#### Batch 2B: features/ (~103 calls)
```
src/features/defi/providers/**
```

#### Batch 2C: pages/ (~67 calls)
```
src/pages/ThorChainLP/**
src/pages/RFOX/**
src/pages/TCY/**
src/pages/Lending/**
src/pages/Yields/**
src/pages/Fox/**
src/pages/Accounts/**
```

#### Batch 2D: components/ (~80 calls)
```
src/components/MultiHopTrade/**
src/components/Modals/Send/**
src/components/Amount/**
src/components/Equity/**
src/components/EarnDashboard/**
src/components/AssetSearch/**
src/components/AssetHeader/**
src/components/AssetAccounts/**
src/components/Layout/**
src/components/TransactionHistoryRows/**
```

#### Batch 2E: lib/ (~60 production calls)
```
src/lib/market-service/**
src/lib/fees/**
src/lib/swapper/**
src/lib/utils/**
```

### Rules
- Remove `fromBaseUnit` from import statements as files are migrated
- If the import becomes empty, remove the entire import line
- If `BigAmount` is not already imported, add `import { BigAmount } from '@shapeshiftoss/utils'`
- Run `yarn type-check && yarn lint --fix` after each batch
- Commit after each batch

---

## Phase 3: Migrate toBaseUnit callers (98 positional + 126 BigAmount calls)

Eliminate ALL `toBaseUnit()` calls from `src/`. Replace with direct BigAmount methods.

### Positional args pattern

```ts
// Before:
toBaseUnit(someValue, precision)
// After:
BigAmount.fromPrecision({ value: someValue, precision }).toBaseUnit()
```

### BigAmount overload pattern

```ts
// Before:
toBaseUnit(someBigAmount)
// After:
someBigAmount.toBaseUnit()
```

### Migration order

Same directory batches as Phase 2. Process in parallel where files overlap.

### Rules
- Same as Phase 2 rules
- Commit after each batch

---

## Phase 4: Remove aliases from src/lib/math.ts

After all callers are migrated, `fromBaseUnit` and `toBaseUnit` should have zero importers.

### Verify
```bash
cd /Users/gomes/Sites/shapeshiftWeb--improvement-audit-2
rg "from '@/lib/math'" src/ --count-matches
rg "from 'lib/math'" src/ --count-matches
```

### Transform src/lib/math.ts

```ts
// Before (current):
import { BigAmount } from '@shapeshiftoss/utils'
import type BigNumber from 'bignumber.js'
import type { BN } from './bignumber/bignumber'

export function fromBaseUnit(amount: BigAmount): string
export function fromBaseUnit(value: BigNumber.Value | undefined, precision: number): string
export function fromBaseUnit(...) { ... }

export function toBaseUnit(amount: BigAmount): string
export function toBaseUnit(value: BigNumber.Value | undefined, precision: number): string
export function toBaseUnit(...) { ... }

export const firstNonZeroDecimal = (number: BN) => { ... }

// After:
import type { BN } from './bignumber/bignumber'

export const firstNonZeroDecimal = (number: BN) => {
  return number.toFixed(10).match(/^-?\d*\.?0*\d{0,2}/)?.[0]
}
```

### Delete test file
- Delete `src/lib/math.test.ts` (tests `fromBaseUnit`/`toBaseUnit` which no longer exist)
- `firstNonZeroDecimal` is tested in `src/lib/bignumber/bignumber.test.ts`

### Commit

---

## Phase 5: Mixed-paradigm cleanup

In the 15 files that use BOTH `bn()/bnOrZero()` AND BigAmount side by side, migrate
remaining BN patterns to BigAmount where the value has known precision.

### Rules
- Only migrate where precision is available in scope
- Don't migrate pure BN arithmetic that has no precision context (e.g. ratios, percentages)
- Don't migrate `bnOrZero()` on values that are genuinely nullable scalars for BN chains
- If migrating eliminates the last `bn`/`bnOrZero` import, remove the import
- Run `yarn type-check && yarn lint --fix`
- Commit

---

## Phase 6: Vernacular cleanup

### Rename: CryptoHumanBalance → CryptoPrecisionBalance (51 occurrences)

**Selectors to rename:**
- `selectCryptoHumanBalanceFilter` → `selectCryptoPrecisionBalanceFilter`
- `selectPortfolioAccountsHumanBalances` → `selectPortfolioAccountsCryptoPrecisionBalances`

**Variables to rename:**
- `cryptoHumanBalance` → `cryptoPrecisionBalance` (32 occurrences, 8 files)
- `totalCryptoHumanBalance` → `totalCryptoPrecisionBalance` (2 occurrences)
- `tcyCryptoHumanBalance` → `tcyCryptoPrecisionBalance` (2 occurrences)
- `feeAssetBalanceCryptoHuman` → `feeAssetBalanceCryptoPrecision` (2 occurrences)

### Rename: amountCryptoHuman → amountCryptoPrecision (31+ occurrences)

- `amountCryptoHuman` in `src/lib/mixpanel/types.ts` type definition
- All consumers in defi providers that pass `amountCryptoHuman` to mixpanel events
- `cryptoHumanAmountAvailable` → `cryptoPrecisionAmountAvailable` (4 occurrences)
- `humanAmount` → `precisionAmount` in lpSelectors.ts (2 occurrences)
- `minAmountCryptoHuman` → `minAmountCryptoPrecision` in validateTradeQuote.ts (2 occurrences)

### DO NOT rename (genuine display-level formatting)
- `timeInPoolHuman`, `nextEpochHuman`, `cooldownPeriodHuman` — time formatting
- `%{...Human}` translation key placeholders — i18n display
- `humanReadableExplanationComponents` — UI component
- `balanceHuman` in YieldsList.tsx — check context, may be display

### Rules
- Use find-and-replace with `replace_all` for each identifier
- Update type definitions first, then consumers
- Run `yarn type-check && yarn lint --fix`
- Commit

---

## Phase 7: Documentation

### Create docs/BIGAMOUNT.md

Contents:
- What BigAmount is and why it exists
- Internal storage model (BigNumber in base units)
- **Construction** — all factory methods with examples
- **Configuration** — `BigAmount.configure()` for assetId resolution, configured in `src/state/store.ts`
- **Output methods** — `.toPrecision()`, `.toBaseUnit()`, `.toFixed()`, `.toSignificant()`, etc.
- **Arithmetic** — `.plus()`, `.minus()`, `.times()`, `.div()` with scalar rules
- **Comparisons & booleans**
- **Static helpers** — `min`, `max`, `isBigAmount`
- **Naming conventions** — `CryptoBaseUnit` (raw) vs `CryptoPrecision` (human-readable)
- **Rules** — prefer `fromBaseUnit` (lossless), never cast `as BigAmount`
- **Test file location** — `packages/utils/src/bigAmount/bigAmount.test.ts`

### Update CLAUDE.md

Add under Project-Specific Rules:

```markdown
### BigAmount (Precision-Aware Numeric Type)
- See `docs/BIGAMOUNT.md` for full API documentation
- Use `BigAmount.fromBaseUnit({ value, precision })` for constructing from raw blockchain values (preferred, lossless)
- Use `BigAmount.fromPrecision({ value, precision })` only when a precision-scale value is all that's available
- Call `.toPrecision()` / `.toBaseUnit()` directly on BigAmount for string extraction — no wrapper aliases
- Core selectors (`selectPortfolioCryptoBalanceByFilter`) return `BigAmount`
- Never cast `as BigAmount` — fix types as needed
- Naming: `CryptoBaseUnit` = raw integer, `CryptoPrecision` = human-readable (NOT "HumanBalance")
```

### Commit

---

## Global Rules (all phases)

1. **Never push** — only commit locally
2. **Run `yarn type-check && yarn lint --fix`** after each batch
3. **Commit after each batch** with descriptive message
4. **Don't touch `packages/utils/src/baseUnits/`** — those positional-args functions stay for external consumers
5. **Don't rename `.toPrecision()`** — keep the method name as-is
6. **Keep `firstNonZeroDecimal` behavior** exactly as origin/develop
7. **Keep `div(0)` behavior** — returns zero
8. **Keep `fromThorBaseUnit`/`toThorBaseUnit`** on BigAmount class
9. **Preserve discriminated union** — `FromBaseUnitWithPrecision` vs `FromBaseUnitWithAssetId` stay mutually exclusive

## Verification

```bash
cd /Users/gomes/Sites/shapeshiftWeb--improvement-audit-2
yarn type-check
yarn lint --fix
npx vitest run packages/utils/src/bigAmount/bigAmount.test.ts
# After Phase 4:
rg "fromBaseUnit|toBaseUnit" src/lib/math.ts  # should only show firstNonZeroDecimal
rg "from '@/lib/math'" src/ -l               # should be zero or firstNonZeroDecimal-only imports
```
