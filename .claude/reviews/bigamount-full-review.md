# BigAmount Migration — Full Code Review

**Branch**: `improvement-audit-2` vs `origin/develop`
**Scope**: 30 commits, 236 files changed, +17,887 / -12,698 lines
**Date**: 2026-02-12

---

## Executive Summary

The migration introduces `BigAmount`, a precision-aware numeric wrapper that stores values in base units internally and provides safe conversion between base-unit and human-readable scales. Core portfolio selectors now return `BigAmount` instead of raw strings. The class is well-tested (186 tests) and all financial calculations maintain mathematical equivalence.

However, the review surfaced **4 preferably-blocking issues**, **8 medium concerns**, and **12 suggestions** spanning API design, naming, test coverage, and migration patterns.

---

## 1. BigAmount Class Design

### 1.1 `toPrecision()` shadows `Number.prototype.toPrecision` — preferably-blocking

`Number.prototype.toPrecision(digits)` returns a string to N significant digits. `BigAmount.toPrecision()` converts from base units to human-readable scale. Completely different semantics, same name. A developer's first instinct seeing `amount.toPrecision()` will be wrong.

The `fromBaseUnit` alias in `src/lib/math.ts` acknowledges the confusion by providing a clearer name, but the underlying method stays misleading.

**Alternatives ranked by clarity:**
1. `toHuman()` / `fromHuman()` — domain-neutral, no JS builtin collision
2. `toCryptoAmount()` / `fromCryptoAmount()` — verbose but explicit
3. `toDisplay()` / `fromDisplay()` — implies formatting
4. `toPrecisionScale()` — matches internal terminology, a bit long

Similarly `fromPrecision` is grammatically odd — "from precision" sounds like constructing from a precision number, not from a precision-scale value. `fromHuman` would be clearer.

### 1.2 Scalar semantics in `plus`/`minus` are a footgun — preferably-blocking

When you call `amount.plus('50000000')`, the scalar `'50000000'` is treated as **precision-scale** (human-readable). So on a BTC BigAmount (precision 8), `balance.plus('50000000')` adds 50 million BTC, not 50 million satoshis.

This is the **exact inverse** of how `times()` works — `times()` treats its scalar as a dimensionless multiplier on the base-unit value. The inconsistency is a trap:

```ts
balance.times(2)    // doubles the amount ✓ (operates on base units)
balance.plus('0.5') // adds 0.5 BTC ✓ (precision-scale)
balance.plus('50000000') // adds 50M BTC! NOT 50M satoshis
```

The comment `// Scalar is precision-scale → convert to base units` exists in source but is invisible at call sites. No JSDoc, no type-level hint.

**Options:**
- Remove scalar overload from `plus`/`minus` entirely — require `BigAmount` for BigAmount-to-BigAmount addition
- Rename to `plusHuman(scalar)` to make the scale explicit
- Add JSDoc/TSDoc making the scale crystal clear

The same concern applies to all comparison methods (`gt`, `gte`, `lt`, `lte`, `eq`) which also treat scalars as precision-scale.

### 1.3 Missing `toBN()` for interop — preferably-blocking

The codebase still has hundreds of BN interop points. Currently these do:
```ts
bn(balance.toPrecision())  // string round-trip: BigAmount → string → BN
```

A `toBN(): BigNumber` method (returning precision-scale BigNumber) would avoid the string serialization and make interop explicit. The string round-trip is functionally correct but adds unnecessary overhead and noise.

### 1.4 `div(0)` / `div(null)` silently produces Infinity/NaN — preferably-blocking

```ts
amount.div(null)  // → BigAmount wrapping Infinity
amount.div(0)     // → BigAmount wrapping Infinity
```

The non-finite BigAmount produces `"Infinity"` from `toPrecision()`, `toFixed()`, `toString()` — which would render in the UI or corrupt Redux state. `toBaseUnit()` returns `"Infinity"` which throws if passed to `BigInt()`.

The `fromBN` constructor guards against non-finite inputs (`isFinite() ? value : bn(0)`), but `div` does not. Construction is safe, operations can produce unsafe values.

**Options:**
- `div(0)` throws an explicit error
- `div` returns `BigAmount.zero(...)` when divisor is zero/nullish (matches codebase's defensive `bnOrZero` culture)
- At minimum, `toBaseUnit()` and `toFixed()` guard against non-finite internal values

### 1.5 Static mutable config — medium

`BigAmount.config` is global mutable state on the class. Test isolation requires `as any` hacks to reset it. In SSR, concurrent requests would share config. Currently client-only so low risk, but a landmine.

**Options:**
- Factory pattern: `const BigAmount = createBigAmount({ resolvePrecision, ... })`
- Accept resolvers as parameters to `toUserCurrency`/`toUSD` instead of pulling from static config
- At minimum: add `BigAmount.resetConfig()` for test cleanup

### 1.6 `toFixed` rounding mode — suggestion

Hard-coded magic number `1` (ROUND_DOWN):
```ts
return precisionValue.toFixed(decimals, 1) // BigNumber.ROUND_DOWN
```

Should use the named constant `BigNumber.ROUND_DOWN` and accept an optional `rm` parameter. Also, `toUserCurrency()` and `toUSD()` use bignumber.js default (`ROUND_HALF_UP`) for their `.toFixed()` — inconsistent with `toFixed()` using `ROUND_DOWN`.

### 1.7 `fromBN` naming ambiguity — suggestion

The name `fromBN` doesn't indicate which scale. A developer holding a base-unit BigNumber would naturally reach for `fromBN` and get a result inflated by `10^precision`. Should be `fromHumanBN()` or `fromPrecisionScaleBN()`.

### 1.8 `assetId` not checked in `plus(BigAmount)` — suggestion

Adding two BigAmounts with different `assetId` but same precision silently drops `other.assetId`:
```ts
const btc = BigAmount.fromPrecision({ value: '1', precision: 8, assetId: 'btc' })
const ltc = BigAmount.fromPrecision({ value: '1', precision: 8, assetId: 'ltc' })
btc.plus(ltc) // result tagged as 'btc', no error
```

`assertSamePrecision` catches precision mismatches but not assetId mismatches. Consider asserting same assetId (when both defined) or documenting as intentional.

### 1.9 `decimalPlaces` default rounding — suggestion

Default rounding is bignumber.js global config (`ROUND_HALF_UP`), not explicitly set. For blockchain amounts, `ROUND_DOWN` is safer. Document the default or explicitly set it.

### 1.10 `toBaseUnit()` truncation — suggestion

`this.value.toFixed(0)` uses BigNumber's default rounding (`ROUND_HALF_UP`). After `times(0.333)` on `100` base units, internal value is `33.3` and `toBaseUnit()` returns `'33'`. This is correct (rounds toward nearest) but the rounding mode differs from `toFixed()` (which uses `ROUND_DOWN`). Worth documenting.

### 1.11 `toSignificant` truncates, doesn't round — suggestion

Uses string slicing rather than mathematical rounding. `toSignificant(3)` on `1.999` returns `1.99`, not `2`. Consistent with ROUND_DOWN philosophy but differs from mathematical convention. Document it.

### 1.12 No `valueOf()` / `Symbol.toPrimitive` — suggestion (intentional)

`+amount` or `amount > 0` with raw numbers won't work. Probably intentional to prevent implicit coercion bugs. Worth noting in docs.

---

## 2. Core Selector Migration

### 2.1 `precision ?? 0` fallback bakes wrong precision — medium

```ts
// common-selectors.ts:124
const precision = assets[assetId as AssetId]?.precision ?? 0
assetBalances[assetId as AssetId] = BigAmount.fromBaseUnit({ value: balance, precision, assetId })
```

If an asset is missing from the store (race condition, new asset not yet indexed), precision falls back to `0`. A base-unit value like `"1000000000000000000"` (1 ETH in wei) would be treated as having 0 decimal places, so `.toPrecision()` returns `"1000000000000000000"` instead of `"1.0"`.

Before the migration, precision was resolved lazily at point-of-use and missing assets caused early returns. Now wrong precision is baked in at construction. All 50+ downstream selectors would see inflated numbers for unknown assets.

### 2.2 `BigAmount.zero({ precision: 0 })` in early returns — medium

```ts
// common-selectors.ts:164-166
if (!assetId) return BigAmount.zero({ precision: 0 })
if (!asset) return BigAmount.zero({ precision: 0 })
```

If this zero-amount is later used in `assertSamePrecision` checks (e.g., `a.plus(zeroResult)`), it would throw for any non-zero precision asset. Safe today because zero values are typically guarded, but fragile.

### 2.3 Cross-precision aggregation — medium

```ts
// common-selectors.ts:260-263
return innerAcc.plus(bn(relatedBalance?.toPrecision() ?? '0'))
```

Summing `.toPrecision()` values from different related assets (which may have different decimal precisions) as raw BN produces a unitless number. Mathematically valid only if all related assets share the same precision (e.g., ETH and WETH both precision 18). Pre-existing logic, not introduced by migration, but worth noting.

### 2.4 Performance: O(accounts * assets) BigAmount constructions — medium

```ts
// common-selectors.ts:109-130
for (const [accountId, byAssetId] of Object.entries(filtered)) {
  for (const [assetId, balance] of Object.entries(byAssetId)) {
    assetBalances[assetId as AssetId] = BigAmount.fromBaseUnit({...})
  }
}
```

Each construction calls `bnOrZero()` which creates a BigNumber. For a wallet with 10 accounts × 50 assets = 500 BigAmount + 500 BigNumber allocations per recompute. Previously was O(n) string operations. Mitigated by `createDeepEqualOutputSelector` memoization, but this is the hottest allocation site in the selector tree.

### 2.5 Variable naming inconsistency — suggestion

`portfolioCryptoBalancesBaseUnit` in `selectAssetEquityItemsByFilter` still says "BaseUnit" but type is `Record<AccountId, Record<AssetId, BigAmount>>`. Should be `portfolioCryptoBalances` or `portfolioAccountBalances`.

### 2.6 `balance.times(price)` carries wrong precision — suggestion

`balance.times(price)` returns a BigAmount with the source asset's precision, but the result represents a fiat value. The precision is semantically wrong for dollars. Not a correctness bug since results are immediately stringified via `.toFixed(2)`, but could cause confusion if someone chains further BigAmount operations.

### 2.7 Positive findings

- **Clean removal of `cloneDeep`** — BigAmount immutability makes defensive cloning unnecessary
- **Redux state layer untouched** — BigAmount exists only in selectors, no serialization/migration concerns
- **Merge of base-unit and precision selectors** into single BigAmount-returning selector is a genuine API improvement
- **`createDeepEqualOutputSelector` as selectorCreator** handles BigAmount correctly via `fast-deep-equal`

---

## 3. Consumer Migration Patterns

### 3.1 `fromBaseUnit`/`toBaseUnit` aliases create massive verbosity — preferably-blocking (design)

The new aliases are trivial one-liners:
```ts
export const fromBaseUnit = (amount: BigAmount): string => amount.toPrecision()
export const toBaseUnit = (amount: BigAmount): string => amount.toBaseUnit()
```

Every call site that previously did `fromBaseUnit(value, precision)` now must do:
```ts
fromBaseUnit(BigAmount.fromBaseUnit({ value, precision }))
```

This is strictly more verbose for identical output. **~359 call sites** use this construct-then-immediately-unwrap pattern.

**Before (1 line):**
```ts
fromBaseUnit(paramsSellAmountCryptoBaseUnit, sellAsset.precision)
```

**After (4 lines, imports BigAmount AND fromBaseUnit):**
```ts
fromBaseUnit(
  BigAmount.fromBaseUnit({ value: paramsSellAmountCryptoBaseUnit, precision: sellAsset.precision }),
)
```

The aliases serve no purpose — they are identical to calling `.toPrecision()` and `.toBaseUnit()` directly. **110+ files** import from both `@shapeshiftoss/utils` (BigAmount) AND `@/lib/math` (aliases).

**Options:**
1. Remove aliases entirely — use `.toPrecision()` / `.toBaseUnit()` directly
2. Restore old signature: `fromBaseUnit(value, precision)` that internally constructs BigAmount
3. Current design is worst of both worlds — requires both imports with zero ergonomic benefit

### 3.2 Two competing patterns, no winner — medium

The codebase has two ways to do the same thing, used inconsistently even within the same file:

**Pattern A (alias wrapping, ~360 uses):**
```ts
fromBaseUnit(BigAmount.fromBaseUnit({ value, precision }))
```

**Pattern B (direct method, ~213 uses):**
```ts
BigAmount.fromBaseUnit({ value, precision }).toPrecision()
```

Both produce identical output. Pick one.

### 3.3 Unnecessary BigAmount round-trips — medium

Constructing BigAmount solely to immediately extract a string:
```ts
// thorchain/balance.ts — SIX BigAmount constructions in one expression
return bnOrZero(amountCryptoPrecision)
  .plus(BigAmount.fromBaseUnit({ value: txFeeCryptoBaseUnit, precision }).toPrecision())
  .plus(BigAmount.fromBaseUnit({ value: sweepTxFeeCryptoBaseUnit, precision }).toPrecision())
  .lte(BigAmount.fromBaseUnit({ value: balanceCryptoBaseUnitBn, precision }).toPrecision())
```

vs the old:
```ts
return bnOrZero(amountCryptoPrecision)
  .plus(fromBaseUnit(txFeeCryptoBaseUnit, precision))
  .plus(fromBaseUnit(sweepTxFeeCryptoBaseUnit, precision))
  .lte(fromBaseUnit(balanceCryptoBaseUnitBn, precision))
```

Where selectors return BigAmount, the round-trips are eliminated. But where data comes as raw strings, the migration adds construction-then-immediate-destruction overhead. Transitional cost.

### 3.4 THORChain utils don't leverage BigAmount's built-in THOR methods — suggestion

The `src/lib/utils/thorchain/index.ts` helper functions use generic two-step conversion paths instead of the dedicated `BigAmount.fromThorBaseUnit()` and `.toThorBaseUnit()` methods. Triple-wrapping:
```ts
bnOrZero(fromBaseUnit(BigAmount.fromBaseUnit({ value: bnOrZero(valueThorBaseUnit).toFixed(0), precision: THOR_PRECISION })))
```

Could be:
```ts
bnOrZero(BigAmount.fromThorBaseUnit(valueThorBaseUnit).toPrecision())
```

---

## 4. Packages Migration

### 4.1 `packages/utils/src/baseUnits/baseUnits.ts` — clean (untouched)

Zero diff against origin/develop. PRD rule respected.

### 4.2 All swapper conversions are semantically correct — clean

Every migration site correctly maps:
- `fromBaseUnit(value, precision)` → `BigAmount.fromBaseUnit({ value, precision }).toPrecision()`
- `toBaseUnit(value, precision)` → `BigAmount.fromPrecision({ value, precision }).toBaseUnit()`
- Manual `bn(x).times(bn(10).pow(precision)).toFixed(0)` → `BigAmount.fromPrecision({ value, precision }).toBaseUnit()`

No base-unit/precision-scale confusion introduced. No precision swaps. No rounding changes.

### 4.3 Redundant `.toString()` in unchained-client — suggestion

```ts
// packages/unchained-client/src/solana/parser/index.ts
value: BigAmount.fromPrecision({ value: tokenAmount, precision: token.decimals }).toBaseUnit().toString()
```

`.toBaseUnit()` already returns string. The `.toString()` is harmless but unnecessary.

### 4.4 Generated JSON files are merge artifacts — clean

The adapter.json changes under `packages/caip/src/adapters/` are from `origin/develop` merge, not BigAmount-related.

---

## 5. Test Coverage

### 5.1 Portfolio selector tests compare BigAmount to strings — preferably-blocking

```ts
// portfolioSlice.test.ts ~line 593
const expected = '1.200009'
const result = selectPortfolioCryptoBalanceByFilter(state, { assetId: ethAssetId })
expect(result).toEqual(expected) // BigAmount !== string — WILL FAIL
```

The selector now returns `BigAmount` but tests still expect strings. This is masked because the test couldn't run (environment issue), but it's a real test failure waiting to happen.

**Fix:** Update to `expect(result.toPrecision()).toEqual(expected)` or compare BigAmount instances.

### 5.2 Missing test: numbers exceeding `Number.MAX_SAFE_INTEGER` — medium

No test for uint256-scale values like `'115792089237316195423570985008687907853269984665640564039457584007913129639935'`. Critical for whale balances and token total supplies.

### 5.3 Missing test: precision 0 — medium

`BigAmount.zero({ precision: 0 })` appears in selector fallbacks but precision=0 construction/round-tripping is not tested.

### 5.4 Missing test: `toBaseUnit()` rounding behavior — medium

After `times(0.333)` on `100` base units, internal value is `33.3`. Does `toBaseUnit()` return `'33'` or `'34'`? (Answer: `'33'` via `ROUND_HALF_UP`, but this should be explicitly tested.)

### 5.5 Missing test: negative values in `fromBaseUnit` — suggestion

No test for `BigAmount.fromBaseUnit({ value: '-150000000', precision: 8 })`.

### 5.6 Missing test: chain of 20+ operations precision stability — suggestion

No test verifying `times(2).div(2)` repeated 20 times maintains exact value.

### 5.7 Missing test: `toSignificant(0)` and `toSignificant(1)` — suggestion

Edge cases not covered.

---

## 6. Documentation

### 6.1 `decimalPlaces` described as "truncate" but uses ROUND_HALF_UP — medium

`docs/BIGAMOUNT.md` says "Truncate decimal places" but the implementation uses bignumber.js default (`ROUND_HALF_UP`). Only `toFixed()` uses `ROUND_DOWN`.

### 6.2 NullableScalar not documented — medium

The docs and CLAUDE.md don't mention that `plus`, `minus`, `times`, `div`, and comparisons accept `null | undefined` scalars. This is a significant ergonomic feature.

### 6.3 CLAUDE.md docs path casing — suggestion

References `docs/bigamount.md` (lowercase) but actual file is `docs/BIGAMOUNT.md` (uppercase). Breaks on case-sensitive filesystems.

### 6.4 `toJSON` assetId optionality not documented — suggestion

Docs say `toJSON()` returns `{ value, precision, assetId }` but `assetId` is optional (`assetId?: string`).

---

## 7. Things That Should NOT Have Been Changed

### 7.1 The `fromBaseUnit`/`toBaseUnit` alias signature

The old `fromBaseUnit(value, precision)` was a perfectly ergonomic API. The new `fromBaseUnit(bigAmount)` forces every call site to construct a BigAmount first, adding verbosity with zero benefit. The alias should either be removed (use `.toPrecision()` directly) or restored to the old positional-args signature.

### 7.2 Nothing else — the rest is clean

All other changes are mechanical, correct migrations. The core financial math is preserved. No behavioral changes in display formatting or rounding.

---

## 8. Naming Audit

| Current Name | Issue | Suggestion |
|---|---|---|
| `toPrecision()` | Shadows `Number.prototype.toPrecision` | `toHuman()` |
| `fromPrecision()` | "from precision" is grammatically ambiguous | `fromHuman()` |
| `fromBN()` | Doesn't indicate scale (base-unit vs precision) | `fromHumanBN()` |
| `NullableScalar` | Good name, accurately describes the type | Keep |
| `assertSamePrecision` | Clear and correct | Keep |
| `assertNotBigAmount` | Clear and correct | Keep |
| `THOR_PRECISION` | Clear | Keep |
| `fromBaseUnit` (alias) | Collides with `BigAmount.fromBaseUnit` (constructor) | Remove or rename to `extractPrecision` |
| `toBaseUnit` (alias) | Collides with `BigAmount.toBaseUnit` (method) | Remove or rename to `extractBaseUnit` |
| `portfolioCryptoBalancesBaseUnit` (selector param) | Says "BaseUnit" but type is BigAmount | `portfolioCryptoBalances` |

---

## 9. Summary Priority Matrix

### Preferably-Blocking (fix before merge)

1. **`toPrecision()` naming** — shadows JS builtin, will confuse every developer
2. **Scalar semantics in `plus`/`minus`** — precision-scale scalars are a footgun with `times` being dimensionless
3. **Missing `toBN()`** — forces string round-trips for BN interop
4. **`div(0)` silently produces Infinity** — will render "Infinity" in UI or corrupt state
5. **Alias design** — `fromBaseUnit(BigAmount.fromBaseUnit({...}))` is the worst of both worlds
6. **Portfolio selector tests broken** — compare BigAmount to string

### Medium (fix soon)

7. **`precision ?? 0` fallback** — bakes wrong precision for missing assets
8. **`BigAmount.zero({ precision: 0 })` in fallbacks** — could throw in arithmetic
9. **Two competing patterns** — alias vs direct method, inconsistent
10. **Cross-precision aggregation** — pre-existing but worth documenting
11. **Missing test: uint256-scale values** — whale balances untested
12. **Missing test: toBaseUnit rounding** — rounding behavior undocumented
13. **`decimalPlaces` docs say "truncate"** — actually ROUND_HALF_UP
14. **NullableScalar undocumented** — key ergonomic feature missing from docs

### Suggestions (nice to have)

15. Static mutable config → factory pattern
16. `toFixed` rounding mode configurable
17. `fromBN` rename to `fromHumanBN`
18. `assetId` not checked in `plus(BigAmount)`
19. THORChain utils should use built-in THOR methods
20. Redundant `.toString()` in unchained-client
21. Variable naming: `portfolioCryptoBalancesBaseUnit`
22. Missing tests: precision 0, negative fromBaseUnit, toSignificant edge cases, precision stability
23. CLAUDE.md docs path casing
