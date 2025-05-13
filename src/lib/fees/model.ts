import type { BigNumber } from 'bignumber.js'

import { DEFAULT_FEE_BPS } from './parameters/swapper'

import { bn, bnOrZero } from '@/lib/bignumber/bignumber'

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
