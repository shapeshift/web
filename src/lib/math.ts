import BigNumber from 'bignumber.js'
import { bnOrZero } from './bignumber/bignumber'

export const fromBaseUnit = (value: string, decimals: number, displayDecimals = 6): string => {
  return new BigNumber(value).div(`1e+${decimals}`).decimalPlaces(displayDecimals).toString()
}
export const toBaseUnit = (amount: string, precision: number): string => {
  return bnOrZero(amount).times(bnOrZero(10).exponentiatedBy(precision)).toFixed(0)
}
