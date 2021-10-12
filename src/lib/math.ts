import { Asset } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'

import { BN, bnOrZero } from './bignumber/bignumber'

export const fromBaseUnit = (value: string, decimals: number, displayDecimals = 6): string => {
  return new BigNumber(value).div(`1e+${decimals}`).decimalPlaces(displayDecimals).toString()
}
export const toBaseUnit = (amount: string, precision: number): string => {
  return bnOrZero(amount).times(bnOrZero(10).exponentiatedBy(precision)).toFixed(0)
}

export const firstNonZeroDecimal = (number: BN) => {
  return number.toFixed(20).match(/^-?\d*\.?0*\d{0,2}/)?.[0]
}

export const getByIdentifier = (asset: Pick<Asset, 'chain' | 'symbol' | 'name'>) => {
  return asset.chain + asset.symbol + asset.name
}
