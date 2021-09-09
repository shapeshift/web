import BigNumber from 'bignumber.js'

export const fromBaseUnit = (value: string, decimals: number, displayDecimals = 6): string => {
  return new BigNumber(value).div(`1e+${decimals}`).decimalPlaces(displayDecimals).toString()
}
