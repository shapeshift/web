# BigAmount — Precision-Aware Numeric Type

`BigAmount` is a precision-aware wrapper around `BigNumber` that stores values internally in **base units** (raw blockchain integers — wei, satoshis, etc.). It encapsulates precision math so consumers never manually divide/multiply by `10^precision`.

**Source**: `packages/utils/src/bigAmount/bigAmount.ts`
**Tests**: `src/lib/amount/BigAmount.test.ts`
**Exported from**: `@shapeshiftoss/utils`

---

## Internal Storage

All values are stored as `BigNumber` in base units. Conversion to human-readable (precision-scale) happens at output time via `.toPrecision()`, which divides by `10^precision`. This means construction from base units is lossless.

---

## Construction

All constructors are nullish-safe (undefined/null/NaN/empty-string → 0).

| Factory | Input | Use when |
|---------|-------|----------|
| `BigAmount.fromBaseUnit({ value, precision })` | Raw blockchain value (wei, satoshis) | **Preferred** — lossless |
| `BigAmount.fromPrecision({ value, precision })` | Human-readable value (1.5 ETH) | Only when you ONLY have a precision-scale value |
| `BigAmount.zero({ precision, assetId? })` | — | Zero value with known precision |
| `BigAmount.fromBN({ value, precision, assetId? })` | Precision-scale BigNumber | Interop with existing BN code |
| `BigAmount.fromThorBaseUnit(value)` | THORChain 8-decimal value | Convenience — hardcoded precision 8 |
| `BigAmount.fromJSON({ value, precision, assetId? })` | Serialized JSON | Deserialization |

Both `fromBaseUnit` and `fromPrecision` accept either `{ value, precision }` or `{ value, assetId }`. The `assetId` variant resolves precision via `BigAmount.configure()`.

---

## Configuration

```ts
BigAmount.configure({
  resolvePrecision: (assetId: string) => number,
  resolvePrice: (assetId: string) => string,
  resolvePriceUsd: (assetId: string) => string,
})
```

Wired in `src/state/store.ts` after store creation. Enables:
- `BigAmount.fromBaseUnit({ value, assetId })` — resolves precision from Redux state
- `.toUserCurrency()` / `.toUSD()` — resolves price from Redux state

---

## Output Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `.toPrecision()` | `string` | Human-readable (e.g., `"1.5"` for 1.5 ETH) |
| `.toBaseUnit()` | `string` | Raw integer (e.g., `"1500000000000000000"`) |
| `.toFixed(decimals?)` | `string` | Precision-scale with optional decimal places (ROUND_DOWN) |
| `.toSignificant(digits)` | `string` | Significant digits display |
| `.toNumber()` | `number` | JS number (precision loss for large values!) |
| `.toString()` | `string` | Same as `.toPrecision()` |
| `.toUserCurrency(decimals?)` | `string` | Fiat value in user's currency (requires configure + assetId) |
| `.toUSD(decimals?)` | `string` | USD value (requires configure + assetId) |
| `.toJSON()` | `object` | `{ value, precision, assetId }` for serialization |

---

## Arithmetic

All arithmetic returns a new `BigAmount` (immutable).

| Method | Accepts | Notes |
|--------|---------|-------|
| `.plus(other)` | `BigAmount` or scalar | BigAmount: same precision enforced. Scalar: treated as precision-scale. |
| `.minus(other)` | `BigAmount` or scalar | Same as plus |
| `.times(scalar)` | Scalar only | BigAmount×BigAmount is dimensionally invalid — throws |
| `.div(scalar)` | Scalar only | Same as times. **Note**: div(0) produces Infinity silently. |
| `.abs()` | — | Absolute value |
| `.negated()` | — | Negate |
| `.positiveOrZero()` | — | Clamp to ≥ 0 |
| `.decimalPlaces(n, rm?)` | — | Truncate decimal places |

---

## Comparisons

All accept `BigAmount` (same precision enforced) or scalar (treated as precision-scale).

`.gt()` `.gte()` `.lt()` `.lte()` `.eq()` `.isZero()` `.isPositive()` `.isNegative()` `.isFinite()`

---

## Static Utilities

| Method | Description |
|--------|-------------|
| `BigAmount.min(...amounts)` | Minimum (same precision enforced) |
| `BigAmount.max(...amounts)` | Maximum (same precision enforced) |
| `BigAmount.isBigAmount(x)` | Type guard |

---

## THORChain Helpers

| Method | Description |
|--------|-------------|
| `BigAmount.fromThorBaseUnit(value)` | Construct from THOR 8-decimal base unit |
| `.toThorBaseUnit()` | Convert any BigAmount to THOR 8-decimal base unit string |

---

## Convenience Aliases (`src/lib/math.ts`)

For app-level (`src/`) code, two aliases provide familiar naming:

```ts
import { fromBaseUnit, toBaseUnit } from '@/lib/math'

// fromBaseUnit: BigAmount → precision-scale string
const humanReadable = fromBaseUnit(balance) // same as balance.toPrecision()

// toBaseUnit: BigAmount → base-unit string
const rawValue = toBaseUnit(balance)        // same as balance.toBaseUnit()
```

These are thin wrappers. `packages/` code uses BigAmount methods directly.

---

## Selector Integration

Core portfolio selectors return `BigAmount`:
- `selectPortfolioCryptoBalanceByFilter` → `BigAmount`
- `selectPortfolioAccountBalances` → `Record<AccountId, Record<AssetId, BigAmount>>`
- `selectPortfolioAssetBalances` → `Record<AssetId, BigAmount>`

Consumers extract strings via `fromBaseUnit(balance)` or `toBaseUnit(balance)`.

---

## Rules

1. **Prefer `BigAmount.fromBaseUnit`** as source of truth — it's lossless (base units are integers)
2. **Use `BigAmount.fromPrecision`** only when you ONLY have a human-readable value
3. **Never cast `as BigAmount`** — fix types as needed
4. **Construction is separate from extraction** — construct with `BigAmount.fromBaseUnit({...})`, extract with `fromBaseUnit(ba)` / `toBaseUnit(ba)`
