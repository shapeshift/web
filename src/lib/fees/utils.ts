import type BigNumber from 'bignumber.js'

import { bn, bnOrZero } from '../bignumber/bignumber'
import { DEFAULT_FEE_BPS } from './constant'

export const AVERAGE_BLOCK_TIME_BLOCKS = 1000
type CalculateFeeUsdArgs = {
  inputAmountUsd: BigNumber.Value
}
type CalculateFeeUsdReturn = {
  feeUsd: BigNumber
}

export const calculateFeeUsd = ({ inputAmountUsd }: CalculateFeeUsdArgs): CalculateFeeUsdReturn => {
  const feeBps = bn(DEFAULT_FEE_BPS)
  const feeUsd = bnOrZero(inputAmountUsd).times(feeBps.div(bn(10000)))

  return { feeUsd }
}
