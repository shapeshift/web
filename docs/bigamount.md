# BigAmount — Precision-Aware Numeric Type

`BigAmount` is a precision-aware wrapper around `BigNumber` that stores values internally in **base units** (raw blockchain integers — wei, satoshis, etc.). It encapsulates precision math so consumers never manually divide/multiply by `10^precision`.

**Source**: `packages/utils/src/bigAmount/bigAmount.ts`
**Tests**: `packages/utils/src/bigAmount/bigAmount.test.ts`
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
| `BigAmount.zero({ precision })` | — | Zero value with known precision |
| `BigAmount.fromBN({ value, precision })` | Precision-scale BigNumber | Interop with existing BN code |
| `BigAmount.fromThorBaseUnit(value)` | THORChain 8-decimal value | Convenience — hardcoded precision 8 |
| `BigAmount.fromJSON({ value, precision })` | Serialized JSON | Deserialization |

Both `fromBaseUnit` and `fromPrecision` accept either `{ value, precision }` or `{ value, assetId }`. The `assetId` variant resolves precision via `BigAmount.configure({ resolvePrecision })`, wired in `src/state/store.ts`.

---

## Configuration

```ts
BigAmount.configure({
  resolvePrecision: (assetId: string) => number,
})
```

Wired in `src/state/store.ts` after store creation. Enables `BigAmount.fromBaseUnit({ value, assetId })` — resolves precision from Redux state.

---

## Output Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `.toPrecision()` | `string` | Human-readable (e.g., `"1.5"` for 1.5 ETH) |
| `.toBaseUnit()` | `string` | Raw integer (e.g., `"1500000000000000000"`) |
| `.toFixed(decimals?)` | `string` | Precision-scale with optional decimal places (ROUND_DOWN) |
| `.toSignificant(digits)` | `string` | Significant digits display |
| `.toNumber()` | `number` | JS number (precision loss for large values!) |
| `.toBN()` | `BigNumber` | Precision-scale BigNumber for BN interop |
| `.toString()` | `string` | Same as `.toPrecision()` |
| `.toJSON()` | `object` | `{ value, precision }` for serialization |

---

## Arithmetic

All arithmetic returns a new `BigAmount` (immutable).

| Method | Accepts | Notes |
|--------|---------|-------|
| `.plus(other)` | `BigAmount` or scalar | BigAmount: same precision enforced. Scalar: treated as precision-scale. |
| `.minus(other)` | `BigAmount` or scalar | Same as plus |
| `.times(scalar)` | Scalar only | BigAmount×BigAmount is dimensionally invalid — throws |
| `.div(scalar)` | Scalar only | Same as times. **div(0) returns zero** (safe default). |
| `.abs()` | — | Absolute value |
| `.negated()` | — | Negate |
| `.positiveOrZero()` | — | Clamp to ≥ 0 |
| `.decimalPlaces(n, rm?)` | — | Round precision-scale value to n decimal places |

**NullableScalar**: `times`/`div`/`plus`/`minus` and all comparisons accept `null`/`undefined` — treated as 0.

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

## Discriminated Union (Constructor Args)

`fromBaseUnit` and `fromPrecision` accept either `{ value, precision }` or `{ value, assetId }` — never both:

```ts
type WithPrecision = { value: NullableScalar; precision: number; assetId?: never }
type WithAssetId = { value: NullableScalar; assetId: string; precision?: never }
```

The `assetId` variant resolves precision via `BigAmount.configure({ resolvePrecision })`, wired in `src/state/store.ts`.

---

## Naming Conventions

| Suffix | Meaning | Example |
|--------|---------|---------|
| `CryptoBaseUnit` | Raw blockchain integer | `amountCryptoBaseUnit = "1500000000000000000"` |
| `CryptoPrecision` | Human-readable decimal | `amountCryptoPrecision = "1.5"` |

**Never use "Human"** for precision-scale values — use `CryptoPrecision`.

---

## Rules

1. **Prefer `BigAmount.fromBaseUnit`** as source of truth — it's lossless (base units are integers)
2. **Use `BigAmount.fromPrecision`** only when you ONLY have a human-readable value
3. **Call `.toPrecision()` / `.toBaseUnit()` directly** on BigAmount for string extraction — no wrapper aliases
4. **Never cast `as BigAmount`** — fix types as needed
5. **Same-precision enforcement** — arithmetic between two BigAmounts requires matching precision
