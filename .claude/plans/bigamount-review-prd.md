# BigAmount Review Fixes — TDD PRD

## Status: IN PROGRESS

## Context

Full review at `.claude/reviews/bigamount-full-review.md` surfaced 23 findings.
This PRD addresses ALL of them in test-first (TDD) order: write failing tests → make them pass → migrate consumers.

Worktree: `/Users/gomes/Sites/shapeshiftWeb--improvement-audit-2`

---

## Phase 1: Failing tests for BigAmount class changes (Red)

Add tests to `src/lib/amount/BigAmount.test.ts` that will FAIL against current implementation.
These tests define the target behavior for Phases 2+.

### 1A: `div(0)` / `div(null)` should return zero, not Infinity (review 1.4)

```ts
describe('div safety', () => {
  it('div(0) returns zero instead of Infinity', () => {
    const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
    expect(amount.div(0).isZero()).toBe(true)
    expect(amount.div(0).isFinite()).toBe(true)
  })

  it('div(null) returns zero instead of Infinity', () => {
    const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
    expect(amount.div(null).isZero()).toBe(true)
  })

  it('div(undefined) returns zero instead of Infinity', () => {
    const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
    expect(amount.div(undefined).isZero()).toBe(true)
  })

  it('div("") returns zero instead of Infinity', () => {
    const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
    expect(amount.div('').isZero()).toBe(true)
  })

  it('div("0") returns zero instead of Infinity', () => {
    const amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
    expect(amount.div('0').isZero()).toBe(true)
  })

  it('div on zero amount returns zero', () => {
    expect(BigAmount.zero({ precision: 18 }).div(0).isZero()).toBe(true)
  })

  it('div by valid divisor still works', () => {
    const amount = BigAmount.fromPrecision({ value: '10', precision: 8 })
    expect(amount.div(2).toPrecision()).toBe('5')
  })
})
```

### 1B: `toBN()` interop method (review 1.3)

```ts
describe('toBN', () => {
  it('returns precision-scale BigNumber', () => {
    const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
    const result = amount.toBN()
    expect(result.toString()).toBe('1.5')
  })

  it('returns BigNumber that can be used in BN chains', () => {
    const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
    expect(amount.toBN().times(60000).toFixed(2)).toBe('90000.00')
  })

  it('returns zero for zero amount', () => {
    expect(BigAmount.zero({ precision: 8 }).toBN().isZero()).toBe(true)
  })

  it('handles negative values', () => {
    const amount = BigAmount.fromPrecision({ value: '-1.5', precision: 8 })
    expect(amount.toBN().toString()).toBe('-1.5')
  })
})
```

### 1C: Rename `toPrecision()` → `toHuman()`, `fromPrecision()` → `fromHuman()` (review 1.1)

Add NEW methods as canonical names. Keep old ones as deprecated aliases.

```ts
describe('toHuman (renamed from toPrecision)', () => {
  it('returns human-readable string', () => {
    const amount = BigAmount.fromBaseUnit({ value: '150000000', precision: 8 })
    expect(amount.toHuman()).toBe('1.5')
  })

  it('is identical to toPrecision (backward compat)', () => {
    const amount = BigAmount.fromBaseUnit({ value: '123456789', precision: 8 })
    expect(amount.toHuman()).toBe(amount.toPrecision())
  })
})

describe('fromHuman (renamed from fromPrecision)', () => {
  it('constructs from human-readable value', () => {
    const amount = BigAmount.fromHuman({ value: '1.5', precision: 8 })
    expect(amount.toHuman()).toBe('1.5')
    expect(amount.toBaseUnit()).toBe('150000000')
  })

  it('is identical to fromPrecision (backward compat)', () => {
    const a = BigAmount.fromHuman({ value: '1.5', precision: 8 })
    const b = BigAmount.fromPrecision({ value: '1.5', precision: 8 })
    expect(a.eq(b)).toBe(true)
  })
})
```

### 1D: Missing edge-case tests (review 5.2-5.7)

```ts
describe('uint256-scale values', () => {
  it('handles max uint256', () => {
    const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
    const amount = BigAmount.fromBaseUnit({ value: maxUint256, precision: 18 })
    expect(amount.toBaseUnit()).toBe(maxUint256)
    expect(amount.isFinite()).toBe(true)
    expect(amount.isZero()).toBe(false)
  })

  it('round-trips uint256 through toJSON/fromJSON', () => {
    const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
    const amount = BigAmount.fromBaseUnit({ value: maxUint256, precision: 18 })
    const restored = BigAmount.fromJSON(amount.toJSON())
    expect(restored.toBaseUnit()).toBe(maxUint256)
  })

  it('arithmetic on uint256 values', () => {
    const large = '100000000000000000000000000000000000000'
    const amount = BigAmount.fromBaseUnit({ value: large, precision: 18 })
    expect(amount.times(2).div(2).toBaseUnit()).toBe(large)
  })
})

describe('precision 0', () => {
  it('constructs with precision 0', () => {
    const amount = BigAmount.fromBaseUnit({ value: '100', precision: 0 })
    expect(amount.toPrecision()).toBe('100')
    expect(amount.toBaseUnit()).toBe('100')
  })

  it('round-trips with precision 0', () => {
    const amount = BigAmount.fromBaseUnit({ value: '42', precision: 0 })
    expect(amount.toBaseUnit()).toBe('42')
  })

  it('zero with precision 0', () => {
    const z = BigAmount.zero({ precision: 0 })
    expect(z.isZero()).toBe(true)
    expect(z.toBaseUnit()).toBe('0')
    expect(z.toPrecision()).toBe('0')
  })

  it('arithmetic with precision 0', () => {
    const a = BigAmount.fromBaseUnit({ value: '10', precision: 0 })
    const b = BigAmount.fromBaseUnit({ value: '3', precision: 0 })
    expect(a.plus(b).toBaseUnit()).toBe('13')
  })
})

describe('negative values in fromBaseUnit', () => {
  it('handles negative base unit values', () => {
    const amount = BigAmount.fromBaseUnit({ value: '-150000000', precision: 8 })
    expect(amount.toPrecision()).toBe('-1.5')
    expect(amount.isNegative()).toBe(true)
    expect(amount.toBaseUnit()).toBe('-150000000')
  })
})

describe('toBaseUnit rounding', () => {
  it('rounds correctly after fractional multiplication', () => {
    const amount = BigAmount.fromBaseUnit({ value: '100', precision: 8 })
    // 100 * 0.333 = 33.3 → toFixed(0) with ROUND_HALF_UP = '33'
    const result = amount.times(0.333)
    expect(result.toBaseUnit()).toBe('33')
  })

  it('rounds correctly at .5 boundary', () => {
    const amount = BigAmount.fromBaseUnit({ value: '100', precision: 8 })
    // 100 * 0.005 = 0.5 → toFixed(0) with ROUND_HALF_UP = '1'
    expect(amount.times(0.005).toBaseUnit()).toBe('1')
  })
})

describe('precision stability over chained operations', () => {
  it('maintains exact value through 20 times(2)/div(2) cycles', () => {
    let amount = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
    for (let i = 0; i < 20; i++) {
      amount = amount.times(2).div(2)
    }
    expect(amount.toBaseUnit()).toBe('1000000000000000000')
  })
})

describe('toSignificant edge cases', () => {
  it('toSignificant(0) returns integer part only', () => {
    const amount = BigAmount.fromPrecision({ value: '12.345', precision: 18 })
    expect(amount.toSignificant(0)).toBe('12')
  })

  it('toSignificant(1) returns one significant digit', () => {
    const amount = BigAmount.fromPrecision({ value: '0.00456', precision: 18 })
    expect(amount.toSignificant(1)).toBe('0.004')
  })
})
```

### 1E: `toFixed` uses named constant (review 1.6)

No new test needed — this is a refactor of `BigNumber.ROUND_DOWN` constant usage. Existing tests cover behavior.

### 1F: `fromBN` rename to `fromHumanBN` (review 1.7)

```ts
describe('fromHumanBN (renamed from fromBN)', () => {
  it('wraps a precision-scale BigNumber', () => {
    const amount = BigAmount.fromHumanBN({ value: bn('1.5'), precision: 8 })
    expect(amount.toPrecision()).toBe('1.5')
  })

  it('is identical to fromBN (backward compat)', () => {
    const a = BigAmount.fromHumanBN({ value: bn('1.5'), precision: 8 })
    const b = BigAmount.fromBN({ value: bn('1.5'), precision: 8 })
    expect(a.eq(b)).toBe(true)
  })
})
```

**Commit after Phase 1** — all new tests should FAIL.

---

## Phase 2: Make tests green — BigAmount class implementation (Green)

### 2A: `div(0)` safety

In `packages/utils/src/bigAmount/bigAmount.ts`, change `div`:

```ts
div(scalar: NullableScalar): BigAmount {
  assertNotBigAmount(scalar, 'div')
  const divisor = bnOrZero(scalar)
  if (divisor.isZero()) {
    return BigAmount.zero({ precision: this.precision, assetId: this.assetId })
  }
  return new BigAmount(this.value.div(divisor), this.precision, this.assetId)
}
```

Update existing tests that expect non-finite: `div(null).isFinite() === false` → `div(null).isZero() === true`.

### 2B: Add `toBN()` method

```ts
toBN(): BigNumber {
  return this.value.div(TEN.pow(this.precision))
}
```

### 2C: Add `toHuman()` / `fromHuman()` canonical names

```ts
// Output — canonical name
toHuman(): string {
  return this.value.div(TEN.pow(this.precision)).toFixed()
}

// Keep toPrecision as alias for backward compat
toPrecision(): string {
  return this.toHuman()
}

// Construction — canonical name
static fromHuman(args: FromPrecisionArgs): BigAmount {
  return BigAmount.fromPrecision(args)
}
```

### 2D: Add `fromHumanBN()` canonical name

```ts
static fromHumanBN(args: { value: BigNumber; precision: number; assetId?: string }): BigAmount {
  return BigAmount.fromBN(args)
}
```

### 2E: Use named `BigNumber.ROUND_DOWN` constant

```ts
import BigNumber from 'bignumber.js'
// ...
return precisionValue.toFixed(decimals, BigNumber.ROUND_DOWN)
```

### 2F: `toBaseUnit()` explicit rounding

```ts
toBaseUnit(): string {
  return this.value.toFixed(0, BigNumber.ROUND_HALF_UP)
}
```

**Commit** — all tests green. Run `yarn type-check && yarn lint --fix`.

---

## Phase 3: Restore ergonomic `fromBaseUnit`/`toBaseUnit` aliases (review 3.1, 7.1)

### 3A: Restore old-signature aliases in `src/lib/math.ts`

The review correctly identifies `fromBaseUnit(BigAmount.fromBaseUnit({...}))` as strictly worse.
Restore the old positional-args signature, internally delegating to BigAmount:

```ts
export const fromBaseUnit = (
  value: BigNumber.Value | BigAmount | undefined,
  precision?: number,
): string => {
  if (BigAmount.isBigAmount(value)) return value.toHuman()
  return BigAmount.fromBaseUnit({ value, precision: precision ?? 0 }).toHuman()
}

export const toBaseUnit = (
  value: BigNumber.Value | BigAmount | undefined,
  precision?: number,
): string => {
  if (BigAmount.isBigAmount(value)) return value.toBaseUnit()
  return BigAmount.fromHuman({ value, precision: precision ?? 0 }).toBaseUnit()
}
```

### 3B: Update math.test.ts

```ts
describe('fromBaseUnit', () => {
  it('accepts BigAmount and returns human string', () => {
    const ba = BigAmount.fromBaseUnit({ value: '1000000000000000000', precision: 18 })
    expect(fromBaseUnit(ba)).toBe('1')
  })

  it('accepts (value, precision) positional args', () => {
    expect(fromBaseUnit('1000000000000000000', 18)).toBe('1')
  })

  it('handles undefined value', () => {
    expect(fromBaseUnit(undefined, 18)).toBe('0')
  })
})

describe('toBaseUnit', () => {
  it('accepts BigAmount and returns base-unit string', () => {
    const ba = BigAmount.fromHuman({ value: '1.5', precision: 18 })
    expect(toBaseUnit(ba)).toBe('1500000000000000000')
  })

  it('accepts (value, precision) positional args', () => {
    expect(toBaseUnit('1.5', 18)).toBe('1500000000000000000')
  })

  it('handles undefined value', () => {
    expect(toBaseUnit(undefined, 18)).toBe('0')
  })
})
```

### 3C: Migrate consumers back to ergonomic calls

Across ~158 files in `src/`:

```ts
// Before (verbose):
fromBaseUnit(BigAmount.fromBaseUnit({ value: x, precision: p }))
// After (ergonomic):
fromBaseUnit(x, p)

// Before (verbose):
toBaseUnit(BigAmount.fromPrecision({ value: x, precision: p }))
// After (ergonomic):
toBaseUnit(x, p)

// When consumer has a BigAmount from selector:
// Before:
fromBaseUnit(balance)          // still works — BigAmount overload
// After:
balance.toHuman()              // or fromBaseUnit(balance) — both fine
```

Remove `BigAmount` import from files that no longer construct BigAmount directly.

**Batch by directory — commit after each batch.**

---

## Phase 4: Fix selector tests + variable naming (review 5.1, 2.5)

### 4A: Fix portfolio selector tests

In `src/state/slices/portfolioSlice/portfolioSlice.test.ts`:

```ts
// Before:
const expected = '1.200009'
const result = selectPortfolioCryptoBalanceByFilter(state, { assetId: ethAssetId })
expect(result).toEqual(expected)

// After:
const result = selectPortfolioCryptoBalanceByFilter(state, { assetId: ethAssetId })
expect(result.toHuman()).toEqual('1.200009')
```

### 4B: Fix variable naming

In `src/state/slices/portfolioSlice/selectors.ts`:
- `portfolioCryptoBalancesBaseUnit` → `portfolioCryptoBalances`

**Commit.**

---

## Phase 5: Fix documentation (review 6.1-6.4)

### 5A: `docs/BIGAMOUNT.md`

1. Fix `decimalPlaces` description: "Truncate" → "Round decimal places (default: ROUND_HALF_UP)"
2. Add NullableScalar section: all scalar-accepting methods accept `null | undefined` (treated as 0)
3. Document `toHuman()` as canonical, `toPrecision()` as alias
4. Document `fromHuman()` as canonical, `fromPrecision()` as alias
5. Document `fromHumanBN()` as canonical, `fromBN()` as alias
6. Document `toBN()` method
7. Document `div(0)` returns zero
8. Fix `toJSON` assetId optionality note
9. Update aliases section for restored positional-args signature

### 5B: Fix CLAUDE.md path casing

```markdown
- See `docs/BIGAMOUNT.md` for full API documentation
```

### 5C: Update `src/lib/math.ts` aliases section

---

## Phase 6: Remaining medium/suggestion items

### 6A: `precision ?? 0` fallback (review 2.1) — ADD TEST, DON'T FIX

The fallback is a pre-existing concern (before BigAmount, missing assets also had bad precision).
Add a test documenting the behavior so future devs know the risk.

### 6B: THORChain utils should use built-in THOR methods (review 3.4) — suggestion

Where `src/lib/utils/thorchain/` does:
```ts
bnOrZero(fromBaseUnit(BigAmount.fromBaseUnit({ value: x, precision: THOR_PRECISION })))
```
Replace with:
```ts
bnOrZero(BigAmount.fromThorBaseUnit(x).toHuman())
```

### 6C: Redundant `.toString()` in unchained-client (review 4.3)

Remove `.toString()` after `.toBaseUnit()` — already returns string.

### 6D: Two competing patterns (review 3.2)

After Phase 3, there should be ONE pattern:
- Selector returns BigAmount → use `.toHuman()` or `fromBaseUnit(balance)`
- Raw string + precision → use `fromBaseUnit(value, precision)` (positional args)
- Remove any remaining `BigAmount.fromBaseUnit({...}).toPrecision()` inline calls

---

## Rules

1. **Test-first**: Write failing tests BEFORE implementation
2. **Zero runtime behavior change** (except div(0) → zero and new methods)
3. **Backward compat**: `toPrecision()`, `fromPrecision()`, `fromBN()` kept as aliases
4. **Run `yarn type-check && yarn lint --fix` after each batch**
5. **Commit after each phase/batch**
6. **Never push**
7. **Run tests**: `npx vitest run src/lib/amount/BigAmount.test.ts src/lib/math.test.ts`

## Verification

```bash
cd /Users/gomes/Sites/shapeshiftWeb--improvement-audit-2
npx vitest run src/lib/amount/BigAmount.test.ts src/lib/math.test.ts
yarn type-check
yarn lint --fix
```
