import type { BigAmount } from '@shapeshiftoss/utils'

import type { BN } from './bignumber/bignumber'

export const fromBaseUnit = (amount: BigAmount): string => amount.toPrecision()

export const toBaseUnit = (amount: BigAmount): string => amount.toBaseUnit()

export const firstNonZeroDecimal = (number: BN) => {
  return number.toFixed(10).match(/^-?\d*\.?0*\d{0,2}/)?.[0]
}
