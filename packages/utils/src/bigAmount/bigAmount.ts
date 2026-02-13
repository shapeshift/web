import type BigNumber from 'bignumber.js'

import { bn, bnOrZero } from '../bignumber/bignumber'

const TEN = bn(10)
const THOR_PRECISION = 8

export class BigAmount {
  private readonly value: BigNumber
  readonly precision: number

  private constructor(value: BigNumber, precision: number) {
    this.value = value
    this.precision = precision
  }

  // ── Construction (all nullish-safe) ───────────────

  static fromBaseUnit({
    value,
    precision,
  }: {
    value: BigNumber.Value | null | undefined
    precision: number
  }): BigAmount {
    return new BigAmount(bnOrZero(value).div(TEN.pow(precision)), precision)
  }

  static fromPrecision({
    value,
    precision,
  }: {
    value: BigNumber.Value | null | undefined
    precision: number
  }): BigAmount {
    return new BigAmount(bnOrZero(value), precision)
  }

  static zero({ precision }: { precision: number }): BigAmount {
    return new BigAmount(bn(0), precision)
  }

  static fromBN({ value, precision }: { value: BigNumber; precision: number }): BigAmount {
    return new BigAmount(value.isFinite() ? value : bn(0), precision)
  }

  static fromJSON({ value, precision }: { value: string; precision: number }): BigAmount {
    return new BigAmount(bn(value), precision)
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

  plus(other: BigAmount | BigNumber.Value): BigAmount {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return new BigAmount(this.value.plus(other.value), this.precision)
    }
    return new BigAmount(this.value.plus(bnOrZero(other)), this.precision)
  }

  minus(other: BigAmount | BigNumber.Value): BigAmount {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return new BigAmount(this.value.minus(other.value), this.precision)
    }
    return new BigAmount(this.value.minus(bnOrZero(other)), this.precision)
  }

  times(scalar: BigNumber.Value): BigAmount {
    assertNotBigAmount(scalar, 'times')
    return new BigAmount(this.value.times(bnOrZero(scalar)), this.precision)
  }

  div(scalar: BigNumber.Value): BigAmount {
    assertNotBigAmount(scalar, 'div')
    return new BigAmount(this.value.div(bnOrZero(scalar)), this.precision)
  }

  abs(): BigAmount {
    return new BigAmount(this.value.abs(), this.precision)
  }

  negated(): BigAmount {
    return new BigAmount(this.value.negated(), this.precision)
  }

  positiveOrZero(): BigAmount {
    return this.value.isPositive() ? this : BigAmount.zero({ precision: this.precision })
  }

  decimalPlaces(n: number, rm?: BigNumber.RoundingMode): BigAmount {
    return new BigAmount(this.value.decimalPlaces(n, rm), this.precision)
  }

  // ── Comparison (terminal → boolean) ───────────────

  gt(other: BigAmount | BigNumber.Value): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.gt(other.value)
    }
    return this.value.gt(bnOrZero(other))
  }

  gte(other: BigAmount | BigNumber.Value): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.gte(other.value)
    }
    return this.value.gte(bnOrZero(other))
  }

  lt(other: BigAmount | BigNumber.Value): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.lt(other.value)
    }
    return this.value.lt(bnOrZero(other))
  }

  lte(other: BigAmount | BigNumber.Value): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.lte(other.value)
    }
    return this.value.lte(bnOrZero(other))
  }

  eq(other: BigAmount | BigNumber.Value): boolean {
    if (other instanceof BigAmount) {
      assertSamePrecision(this, other)
      return this.value.eq(other.value)
    }
    return this.value.eq(bnOrZero(other))
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
    return this.value.times(TEN.pow(this.precision)).toFixed(0)
  }

  toPrecision(): string {
    return this.value.toFixed()
  }

  toFixed(decimals?: number): string {
    if (typeof decimals === 'number') {
      return this.value.toFixed(decimals, 1) // BigNumber.ROUND_DOWN
    }
    return this.value.toFixed()
  }

  toString(): string {
    return this.value.toFixed()
  }

  toNumber(): number {
    return this.value.toNumber()
  }

  toSignificant(digits: number): string {
    if (this.value.isZero()) return '0'

    const fixed = this.value.toFixed()
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

  // ── THORChain precision ──────────────────────────
  // This is basically a convertPrecision of sorts accommodated for THOR precision
  // conversion explicitly — i.e the ONLY reason we should ever convertPrecision
  // vs. leveraging toPrecision() or toBaseUnit().
  // THORChain uses 8-decimal base units for ALL amounts regardless of the
  // underlying asset's native precision.
  // Usage:
  //   BigAmount.fromThorBaseUnit(thorBaseUnit).toPrecision()  // THOR base unit → human
  //   BigAmount.fromBaseUnit({ value, precision: asset.precision }).toThorBaseUnit()  // native → THOR base unit

  static fromThorBaseUnit(value: BigNumber.Value | null | undefined): BigAmount {
    return BigAmount.fromBaseUnit({ value, precision: THOR_PRECISION })
  }

  toThorBaseUnit(): string {
    return this.value.times(TEN.pow(THOR_PRECISION)).toFixed(0)
  }

  // ── Interop ───────────────────────────────────────

  toBN(): BigNumber {
    return this.value
  }

  toJSON(): { value: string; precision: number } {
    return { value: this.value.toFixed(), precision: this.precision }
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
      `BigAmount.${method} does not accept BigAmount as argument (dimensionally invalid). Use .toBN() to unwrap first.`,
    )
  }
}
