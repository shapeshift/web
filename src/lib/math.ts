import BigNumber from 'bignumber.js'

import type { BN } from './bignumber/bignumber'
import { bn, bnOrZero } from './bignumber/bignumber'

// Converts from base unit to a precision/ish number
// If no displayDecimals are provided, it will use the full precision of the number
// If displayDecimals are provided, it will use that precision, to return e.g a human, precision, or number stripped to any arbitrary decimal places
export const fromBaseUnit = (
  value: BigNumber.Value,
  precision: number,
  displayDecimals = 18,
): string => {
  return bnOrZero(value)
    .div(bn(10).pow(precision))
    .decimalPlaces(displayDecimals, BigNumber.ROUND_DOWN)
    .toFixed()
}

export const toBaseUnit = (amount: BigNumber.Value | undefined, precision: number): string => {
  return bnOrZero(amount)
    .times(bn(10).exponentiatedBy(bnOrZero(precision)))
    .toFixed(0)
}

export const firstNonZeroDecimal = (number: BN) => {
  return number.toFixed(10).match(/^-?\d*\.?0*\d{0,2}/)?.[0]
}
