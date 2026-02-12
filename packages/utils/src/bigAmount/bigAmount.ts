import type BigNumber from 'bignumber.js'

import { bn, bnOrZero } from '../bignumber/bignumber'

const ROUND_DOWN = 1 as BigNumber.RoundingMode
const ROUND_HALF_UP = 4 as BigNumber.RoundingMode

const TEN = bn(10)
const THOR_PRECISION = 8

type NullableScalar = BigNumber.Value | null | undefined

export type BigAmountConfig = {
  resolvePrecision: (assetId: string) => number
  resolvePrice: (assetId: string) => string
  resolvePriceUsd: (assetId: string) => string
}

type FromBaseUnitWithPrecision = {
  value: BigNumber.Value | null | undefined
  precision: number
  assetId?: never
}

type FromBaseUnitWithAssetId = {
  value: BigNumber.Value | null | undefined
  assetId: string
  precision?: never
}

type FromBaseUnitArgs = FromBaseUnitWithPrecision | FromBaseUnitWithAssetId

type FromPrecisionWithPrecision = {
  value: BigNumber.Value | null | undefined
  precision: number
  assetId?: never
}

type FromPrecisionWithAssetId = {
  value: BigNumber.Value | null | undefined
  assetId: string
  precision?: never
}

type FromPrecisionArgs = FromPrecisionWithPrecision | FromPrecisionWithAssetId

export class BigAmount {
  // Internal value is ALWAYS in base units (raw blockchain integer scale).
  // e.g., 150000000 for 1.5 BTC, 1000000000000000000 for 1 ETH.
  private readonly value: BigNumber
  readonly precision: number
  readonly assetId?: string

  private static config?: BigAmountConfig

  private constructor(value: BigNumber, precision: number, assetId?: string) {
    this.value = value
    this.precision = precision
    this.assetId = assetId
  }

  // ── Configuration ───────────────────────────────

  /** Wire up assetId → precision/price resolution. Call once at app init. */
  static configure(config: BigAmountConfig): void {
    BigAmount.config = config
  }

  /** Get current configuration, if any. */
  static getConfig(): BigAmountConfig | undefined {
    return BigAmount.config
  }

  /** Clear configuration (for testing). */
  static resetConfig(): void {
    BigAmount.config = undefined
  }

  // ── Construction (all nullish-safe) ───────────────

  /** Create from base-unit (raw blockchain) value. Preferred — lossless. */
  static fromBaseUnit(args: FromBaseUnitArgs): BigAmount {
    if ('assetId' in args && args.assetId !== undefined) {
      const precision = BigAmount.resolveConfigPrecision(args.assetId)
      return new BigAmount(bnOrZero(args.value), precision, args.assetId)
    }
    return new BigAmount(bnOrZero(args.value), args.precision)
  }

  /** Create from precision-scale (human-readable) value. Use only when base unit is unavailable. */
  static fromPrecision(args: FromPrecisionArgs): BigAmount {
    if ('assetId' in args && args.assetId !== undefined) {
      const precision = BigAmount.resolveConfigPrecision(args.assetId)
      return new BigAmount(bnOrZero(args.value).times(TEN.pow(precision)), precision, args.assetId)
    }
    return new BigAmount(bnOrZero(args.value).times(TEN.pow(args.precision)), args.precision)
  }

  /** Create a zero-value BigAmount at the given precision. */
  static zero({ precision, assetId }: { precision: number; assetId?: string }): BigAmount {
    return new BigAmount(bn(0), precision, assetId)
  }

  /** Create from a precision-scale BigNumber. Non-finite values become zero. */
  static fromBN({
    value,
    precision,
    assetId,
  }: {
    value: BigNumber
    precision: number
    assetId?: string
  }): BigAmount {
    const safeValue = value.isFinite() ? value : bn(0)
    return new BigAmount(safeValue.times(TEN.pow(precision)), precision, assetId)
  }

  /** Deserialize from toJSON() output. Value is in base units. */
  static fromJSON({
    value,
    precision,
    assetId,
  }: {
    value: string
    precision: number
    assetId?: string
  }): BigAmount {
    return new BigAmount(bn(value), precision, assetId)
  }

  /** Return the smallest of the given amounts. All must share the same precision. */
  static min(...amounts: BigAmount[]): BigAmount {
    if (amounts.length === 0) throw new Error('BigAmount.min requires at least one argument')
    return amounts.reduce((acc, cur) => {
      assertSamePrecision(acc, cur)
      return acc.value.lte(cur.value) ? acc : cur
    })
  }

  /** Return the largest of the given amounts. All must share the same precision. */
  static max(...amounts: BigAmount[]): BigAmount {
    if (amounts.length === 0) throw new Error('BigAmount.max requires at least one argument')
    return amounts.reduce((acc, cur) => {
      assertSamePrecision(acc, cur)
      return acc.value.gte(cur.value) ? acc : cur
    })
  }

  /** Type guard: returns true if value is a BigAmount instance. */
  static isBigAmount(value: unknown): value is BigAmount {
    return value instanceof BigAmount
  }

  // ── Arithmetic (chainable → BigAmount) ────────────

  /** Add another BigAmount (same precision required) or a precision-scale scalar. */
  plus(other: BigAmount | NullableScalar): BigAmount {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return new BigAmount(this.value.plus(other.value), this.precision, this.assetId)
    }
    // Scalar is precision-scale → convert to base units
    return new BigAmount(
      this.value.plus(bnOrZero(other).times(TEN.pow(this.precision))),
      this.precision,
      this.assetId,
    )
  }

  /** Subtract another BigAmount (same precision required) or a precision-scale scalar. */
  minus(other: BigAmount | NullableScalar): BigAmount {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return new BigAmount(this.value.minus(other.value), this.precision, this.assetId)
    }
    // Scalar is precision-scale → convert to base units
    return new BigAmount(
      this.value.minus(bnOrZero(other).times(TEN.pow(this.precision))),
      this.precision,
      this.assetId,
    )
  }

  /** Multiply by a dimensionless scalar. Passing BigAmount throws TypeError. */
  times(scalar: NullableScalar): BigAmount {
    assertNotBigAmount(scalar, 'times')
    return new BigAmount(this.value.times(bnOrZero(scalar)), this.precision, this.assetId)
  }

  /** Divide by a dimensionless scalar. Division by zero returns zero. Passing BigAmount throws TypeError. */
  div(scalar: NullableScalar): BigAmount {
    assertNotBigAmount(scalar, 'div')
    const divisor = bnOrZero(scalar)
    if (divisor.isZero()) {
      return BigAmount.zero({ precision: this.precision, assetId: this.assetId })
    }
    return new BigAmount(this.value.div(divisor), this.precision, this.assetId)
  }

  /** Absolute value. */
  abs(): BigAmount {
    return new BigAmount(this.value.abs(), this.precision, this.assetId)
  }

  /** Negate the value. */
  negated(): BigAmount {
    return new BigAmount(this.value.negated(), this.precision, this.assetId)
  }

  /** Clamp to zero if negative; return self if positive or zero. */
  positiveOrZero(): BigAmount {
    return this.value.isPositive()
      ? this
      : BigAmount.zero({ precision: this.precision, assetId: this.assetId })
  }

  /** Round the precision-scale value to n decimal places. */
  decimalPlaces(n: number, rm?: BigNumber.RoundingMode): BigAmount {
    // Operate on precision-scale, then convert back to base units
    const precisionValue = this.value.div(TEN.pow(this.precision))
    const truncated = precisionValue.decimalPlaces(n, rm)
    return new BigAmount(truncated.times(TEN.pow(this.precision)), this.precision, this.assetId)
  }

  // ── Comparison (terminal → boolean) ───────────────

  /** Greater than: compare with BigAmount (same precision) or precision-scale scalar. */
  gt(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.gt(other.value)
    }
    return this.value.gt(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  /** Greater than or equal: compare with BigAmount (same precision) or precision-scale scalar. */
  gte(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.gte(other.value)
    }
    return this.value.gte(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  /** Less than: compare with BigAmount (same precision) or precision-scale scalar. */
  lt(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.lt(other.value)
    }
    return this.value.lt(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  /** Less than or equal: compare with BigAmount (same precision) or precision-scale scalar. */
  lte(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.lte(other.value)
    }
    return this.value.lte(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  /** Equal: compare with BigAmount (same precision) or precision-scale scalar. */
  eq(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.eq(other.value)
    }
    return this.value.eq(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  /** True if value is exactly zero. */
  isZero(): boolean {
    return this.value.isZero()
  }

  /** True if value is positive (BigNumber considers zero positive). */
  isPositive(): boolean {
    return this.value.isPositive()
  }

  /** True if value is strictly negative. */
  isNegative(): boolean {
    return this.value.isNegative()
  }

  /** True if value is finite (always true for well-constructed BigAmounts). */
  isFinite(): boolean {
    return this.value.isFinite()
  }

  // ── Output ────────────────────────────────────────

  /** Base-unit string (raw integer). Rounds via ROUND_HALF_UP. */
  toBaseUnit(): string {
    return this.value.toFixed(0, ROUND_HALF_UP)
  }

  /** Precision-scale string (human-readable). E.g. "1.5" for 150000000 at precision 8. */
  toPrecision(): string {
    return this.value.div(TEN.pow(this.precision)).toFixed()
  }

  /** Precision-scale BigNumber for interop with BN arithmetic chains. */
  toBN(): BigNumber {
    return this.value.div(TEN.pow(this.precision))
  }

  /** Fixed decimal string. ROUND_DOWN when decimals specified; full precision otherwise. */
  toFixed(decimals?: number): string {
    const precisionValue = this.value.div(TEN.pow(this.precision))
    if (typeof decimals === 'number') {
      return precisionValue.toFixed(decimals, ROUND_DOWN)
    }
    return precisionValue.toFixed()
  }

  /** String representation (alias for toPrecision). */
  toString(): string {
    return this.toPrecision()
  }

  /** JavaScript number (may lose precision for large values). */
  toNumber(): number {
    return this.value.div(TEN.pow(this.precision)).toNumber()
  }

  /** Format to n significant digits, stripping trailing zeros. */
  toSignificant(digits: number): string {
    const precisionValue = this.value.div(TEN.pow(this.precision))
    if (precisionValue.isZero()) return '0'

    const fixed = precisionValue.toFixed()
    const isNeg = fixed.startsWith('-')
    const abs = isNeg ? fixed.slice(1) : fixed

    const dotIndex = abs.indexOf('.')
    if (dotIndex === -1) return fixed

    const intPart = abs.slice(0, dotIndex)
    const decPart = abs.slice(dotIndex + 1)

    if (intPart !== '0') {
      const intDigits = intPart.length
      if (intDigits >= digits) return (isNeg ? '-' : '') + intPart

      const trimmed = decPart.slice(0, digits - intDigits)
      const result = `${intPart}.${trimmed}`.replace(/\.?0+$/, '')
      return (isNeg ? '-' : '') + result
    }

    let firstNonZero = 0
    while (firstNonZero < decPart.length && decPart[firstNonZero] === '0') {
      firstNonZero++
    }

    const significantPart = decPart.slice(firstNonZero, firstNonZero + digits)
    const leadingZeros = decPart.slice(0, firstNonZero)
    const result = `0.${leadingZeros}${significantPart}`.replace(/0+$/, '')

    return (isNeg ? '-' : '') + result
  }

  // ── Fiat conversion ────────────────────────────────

  /** Convert to user's local currency string. Requires assetId and configure(). */
  toUserCurrency(decimals = 2): string {
    if (!this.assetId) throw new Error('BigAmount: toUserCurrency() requires assetId')
    if (!BigAmount.config?.resolvePrice) throw new Error('BigAmount: not configured')
    const price = BigAmount.config.resolvePrice(this.assetId)
    return this.value.div(TEN.pow(this.precision)).times(bnOrZero(price)).toFixed(decimals)
  }

  /** Convert to USD string. Requires assetId and configure(). */
  toUSD(decimals = 2): string {
    if (!this.assetId) throw new Error('BigAmount: toUSD() requires assetId')
    if (!BigAmount.config?.resolvePriceUsd) throw new Error('BigAmount: not configured')
    const priceUsd = BigAmount.config.resolvePriceUsd(this.assetId)
    return this.value.div(TEN.pow(this.precision)).times(bnOrZero(priceUsd)).toFixed(decimals)
  }

  // ── THORChain precision ──────────────────────────

  /** Create from THORChain base unit (precision 8). */
  static fromThorBaseUnit(value: BigNumber.Value | null | undefined): BigAmount {
    return BigAmount.fromBaseUnit({ value, precision: THOR_PRECISION })
  }

  /** Convert to THORChain base unit string (precision 8). */
  toThorBaseUnit(): string {
    return this.value.times(TEN.pow(THOR_PRECISION)).div(TEN.pow(this.precision)).toFixed(0)
  }

  // ── Interop ───────────────────────────────────────

  /** Serialize to { value, precision, assetId? }. Value is base-unit integer string. */
  toJSON(): { value: string; precision: number; assetId?: string } {
    return { value: this.value.toFixed(0), precision: this.precision, assetId: this.assetId }
  }

  // ── Private helpers ────────────────────────────────

  private static resolveConfigPrecision(assetId: string): number {
    if (!BigAmount.config?.resolvePrecision) {
      throw new Error('BigAmount: not configured — call BigAmount.configure() first')
    }
    return BigAmount.config.resolvePrecision(assetId)
  }
}

function assertSamePrecision(a: BigAmount, b: BigAmount): void {
  if (a.precision !== b.precision) {
    throw new Error(
      `Cannot operate on amounts with different precisions: ${a.precision} vs ${b.precision}`,
    )
  }
}

function assertNotBigAmount(value: unknown, method: string): void {
  if (value instanceof BigAmount) {
    throw new TypeError(
      `BigAmount.${method} does not accept BigAmount as argument (dimensionally invalid). Use .toFixed() to extract the scalar first.`,
    )
  }
}
