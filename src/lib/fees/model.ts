import type { BigNumber } from 'bignumber.js'

import { DEFAULT_FEE_BPS } from './parameters/swapper'

import { bn } from '@/lib/bignumber/bignumber'

type CalculateFeeUsdArgs = {
  tradeAmountUsd: BigNumber
}

type CalculateFeeUsdReturn = {
  feeUsd: BigNumber
}

export const calculateFeeUsd = ({ tradeAmountUsd }: CalculateFeeUsdArgs): CalculateFeeUsdReturn => {
  const feeBps = bn(DEFAULT_FEE_BPS)
  const feeUsd = tradeAmountUsd.multipliedBy(feeBps.div(bn(10000)))

  return { feeUsd }
}
