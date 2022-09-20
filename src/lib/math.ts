import BigNumber from 'bignumber.js'

import type { BN } from './bignumber/bignumber'
import { bn, bnOrZero } from './bignumber/bignumber'

export const fromBaseUnit = (
  value: BigNumber.Value,
  decimals: number,
  displayDecimals = 6,
): string => {
  return bnOrZero(value)
    .div(`1e+${decimals}`)
    .decimalPlaces(displayDecimals, BigNumber.ROUND_DOWN)
    .toString()
}

export const toBaseUnit = (amount: BigNumber.Value | undefined, precision: number): string => {
  return bnOrZero(amount)
    .times(bn(10).exponentiatedBy(bnOrZero(precision)))
    .toFixed(0)
}

export const firstNonZeroDecimal = (number: BN) => {
  return number.toFixed(10).match(/^-?\d*\.?0*\d{0,2}/)?.[0]
}
