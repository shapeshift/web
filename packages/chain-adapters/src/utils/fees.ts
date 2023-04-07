import BigNumber from 'bignumber.js'

import type { FeeDataKey } from '../types'
import { bnOrZero } from './bignumber'

export type ConfirmationSpeed = `${FeeDataKey}`
export type Fee = string | number | BigNumber
export type Scalars = Record<ConfirmationSpeed, BigNumber>

export const calcFee = (fee: Fee, speed: ConfirmationSpeed, scalars: Scalars): string => {
  return bnOrZero(fee).times(scalars[speed]).toFixed(0, BigNumber.ROUND_CEIL).toString()
}
