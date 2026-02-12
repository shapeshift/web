import { BigAmount } from '@shapeshiftoss/utils'
import type BigNumber from 'bignumber.js'

import type { BN } from './bignumber/bignumber'

export function fromBaseUnit(amount: BigAmount): string
export function fromBaseUnit(value: BigNumber.Value | undefined, precision: number): string
export function fromBaseUnit(
  valueOrAmount: BigAmount | BigNumber.Value | undefined,
  precision?: number,
): string {
  if (BigAmount.isBigAmount(valueOrAmount)) return valueOrAmount.toPrecision()
  return BigAmount.fromBaseUnit({ value: valueOrAmount, precision: precision ?? 0 }).toPrecision()
}

export function toBaseUnit(amount: BigAmount): string
export function toBaseUnit(value: BigNumber.Value | undefined, precision: number): string
export function toBaseUnit(
  valueOrAmount: BigAmount | BigNumber.Value | undefined,
  precision?: number,
): string {
  if (BigAmount.isBigAmount(valueOrAmount)) return valueOrAmount.toBaseUnit()
  return BigAmount.fromPrecision({ value: valueOrAmount, precision: precision ?? 0 }).toBaseUnit()
}

export const firstNonZeroDecimal = (number: BN) => {
  return number.toFixed(10).match(/^-?\d*\.?0*\d{0,2}/)?.[0]
}
