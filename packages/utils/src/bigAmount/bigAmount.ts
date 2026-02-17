import type BigNumber from 'bignumber.js'

import { bn, bnOrZero } from '../bignumber/bignumber'

const ROUND_DOWN = 1 as BigNumber.RoundingMode
const ROUND_HALF_UP = 4 as BigNumber.RoundingMode

const TEN = bn(10)
const THOR_PRECISION = 8

type NullableScalar = BigNumber.Value | null | undefined

type WithPrecision = {
  value: BigNumber.Value | null | undefined
  precision: number
  assetId?: never
}
type WithAssetId = { value: BigNumber.Value | null | undefined; assetId: string; precision?: never }
type FactoryArgs = WithPrecision | WithAssetId

export type BigAmountConfig = {
  resolvePrecision: (assetId: string) => number
  resolvePrice: (assetId: string) => string
  resolvePriceUsd: (assetId: string) => string
}

export class BigAmount {
  // Internal value is ALWAYS in base units (raw blockchain integer scale).
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

  static configure(config: BigAmountConfig): void {
    BigAmount.config = config
  }

  static getConfig(): BigAmountConfig | undefined {
    return BigAmount.config
  }

  static resetConfig(): void {
    BigAmount.config = undefined
  }

  // ── Construction (all nullish-safe) ───────────────

  static fromBaseUnit(args: FactoryArgs): BigAmount {
    if ('assetId' in args && args.assetId !== undefined) {
      const precision = BigAmount.resolveConfigPrecision(args.assetId)
      return new BigAmount(bnOrZero(args.value), precision, args.assetId)
    }
    return new BigAmount(bnOrZero(args.value), args.precision)
  }

  static fromPrecision(args: FactoryArgs): BigAmount {
    if ('assetId' in args && args.assetId !== undefined) {
      const precision = BigAmount.resolveConfigPrecision(args.assetId)
      return new BigAmount(bnOrZero(args.value).times(TEN.pow(precision)), precision, args.assetId)
    }
    return new BigAmount(bnOrZero(args.value).times(TEN.pow(args.precision)), args.precision)
  }

  static zero({ precision, assetId }: { precision: number; assetId?: string }): BigAmount {
    return new BigAmount(bn(0), precision, assetId)
  }

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

  static min(...amounts: BigAmount[]): BigAmount {
    if (amounts.length === 0) throw new Error('BigAmount.min requires at least one argument')
    return amounts.reduce((acc, cur) => {
      assertSamePrecision(acc, cur)
      return acc.value.lte(cur.value) ? acc : cur
    })
  }

  static max(...amounts: BigAmount[]): BigAmount {
    if (amounts.length === 0) throw new Error('BigAmount.max requires at least one argument')
    return amounts.reduce((acc, cur) => {
      assertSamePrecision(acc, cur)
      return acc.value.gte(cur.value) ? acc : cur
    })
  }

  static isBigAmount(value: unknown): value is BigAmount {
    return value instanceof BigAmount
  }

  // ── Arithmetic (chainable → BigAmount) ────────────

  plus(other: BigAmount | NullableScalar): BigAmount {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return new BigAmount(this.value.plus(other.value), this.precision, this.assetId)
    }
    return new BigAmount(
      this.value.plus(bnOrZero(other).times(TEN.pow(this.precision))),
      this.precision,
      this.assetId,
    )
  }

  minus(other: BigAmount | NullableScalar): BigAmount {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return new BigAmount(this.value.minus(other.value), this.precision, this.assetId)
    }
    return new BigAmount(
      this.value.minus(bnOrZero(other).times(TEN.pow(this.precision))),
      this.precision,
      this.assetId,
    )
  }

  times(scalar: NullableScalar): BigAmount {
    assertNotBigAmount(scalar, 'times')
    return new BigAmount(this.value.times(bnOrZero(scalar)), this.precision, this.assetId)
  }

  div(scalar: NullableScalar): BigAmount {
    assertNotBigAmount(scalar, 'div')
    const divisor = bnOrZero(scalar)
    if (divisor.isZero()) {
      return BigAmount.zero({ precision: this.precision, assetId: this.assetId })
    }
    return new BigAmount(this.value.div(divisor), this.precision, this.assetId)
  }

  abs(): BigAmount {
    return new BigAmount(this.value.abs(), this.precision, this.assetId)
  }

  negated(): BigAmount {
    return new BigAmount(this.value.negated(), this.precision, this.assetId)
  }

  positiveOrZero(): BigAmount {
    return this.value.isPositive()
      ? this
      : BigAmount.zero({ precision: this.precision, assetId: this.assetId })
  }

  decimalPlaces(n: number, rm?: BigNumber.RoundingMode): BigAmount {
    const precisionValue = this.value.div(TEN.pow(this.precision))
    const truncated = precisionValue.decimalPlaces(n, rm)
    return new BigAmount(truncated.times(TEN.pow(this.precision)), this.precision, this.assetId)
  }

  // ── Comparison (terminal → boolean) ───────────────

  gt(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.gt(other.value)
    }
    return this.value.gt(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  gte(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.gte(other.value)
    }
    return this.value.gte(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  lt(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.lt(other.value)
    }
    return this.value.lt(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  lte(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.lte(other.value)
    }
    return this.value.lte(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  eq(other: BigAmount | NullableScalar): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.eq(other.value)
    }
    return this.value.eq(bnOrZero(other).times(TEN.pow(this.precision)))
  }

  isZero(): boolean {
    return this.value.isZero()
  }

  isPositive(): boolean {
    return this.value.isPositive()
  }

  isNegative(): boolean {
    return this.value.isNegative()
  }

  isFinite(): boolean {
    return this.value.isFinite()
  }

  // ── Output ────────────────────────────────────────

  toBaseUnit(): string {
    return this.value.toFixed(0, ROUND_HALF_UP)
  }

  toPrecision(): string {
    return this.value.div(TEN.pow(this.precision)).toFixed()
  }

  toBN(): BigNumber {
    return this.value.div(TEN.pow(this.precision))
  }

  toFixed(decimals?: number): string {
    const precisionValue = this.value.div(TEN.pow(this.precision))
    if (typeof decimals === 'number') {
      return precisionValue.toFixed(decimals, ROUND_DOWN)
    }
    return precisionValue.toFixed()
  }

  toString(): string {
    return this.toPrecision()
  }

  toNumber(): number {
    return this.value.div(TEN.pow(this.precision)).toNumber()
  }

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

  toUserCurrency(decimals = 2): string {
    if (!this.assetId) throw new Error('BigAmount: toUserCurrency() requires assetId')
    if (!BigAmount.config?.resolvePrice) throw new Error('BigAmount: not configured')
    const price = BigAmount.config.resolvePrice(this.assetId)
    return this.value
      .div(TEN.pow(this.precision))
      .times(bnOrZero(price))
      .toFixed(decimals, ROUND_HALF_UP)
  }

  toUSD(decimals = 2): string {
    if (!this.assetId) throw new Error('BigAmount: toUSD() requires assetId')
    if (!BigAmount.config?.resolvePriceUsd) throw new Error('BigAmount: not configured')
    const priceUsd = BigAmount.config.resolvePriceUsd(this.assetId)
    return this.value
      .div(TEN.pow(this.precision))
      .times(bnOrZero(priceUsd))
      .toFixed(decimals, ROUND_HALF_UP)
  }

  // ── THORChain precision ──────────────────────────

  static fromThorBaseUnit(value: BigNumber.Value | null | undefined): BigAmount {
    return BigAmount.fromBaseUnit({ value, precision: THOR_PRECISION })
  }

  toThorBaseUnit(): string {
    return this.value
      .times(TEN.pow(THOR_PRECISION))
      .div(TEN.pow(this.precision))
      .toFixed(0, ROUND_HALF_UP)
  }

  // ── Interop ───────────────────────────────────────

  toJSON(): { value: string; precision: number; assetId?: string } {
    return {
      value: this.value.toFixed(0, ROUND_HALF_UP),
      precision: this.precision,
      assetId: this.assetId,
    }
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
      `BigAmount.${method} does not accept BigAmount as argument (dimensionally invalid). Use .toPrecision() or .toBaseUnit() to extract the scalar first.`,
    )
  }
}
