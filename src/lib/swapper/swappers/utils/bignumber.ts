// TODO: @woody - merge this file with 'lib/bignumber/bignumber'

import { BigNumber } from 'lib/bignumber/bignumber'

export const bn = (n: BigNumber.Value, base = 10): BigNumber => new BigNumber(n, base)

export const bnOrZero = (n: BigNumber.Value | null | undefined): BigNumber => {
  const value = bn(n || 0)
  return value.isNaN() ? bn(0) : value
}

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
    .times(new BigNumber(10).exponentiatedBy(bnOrZero(precision)))
    .toFixed(0)
}
