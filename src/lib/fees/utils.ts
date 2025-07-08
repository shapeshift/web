import type BigNumber from 'bignumber.js'

import { bn, bnOrZero } from '../bignumber/bignumber'
import { DEFAULT_FEE_BPS } from './constant'

type CalculateFeeUsdArgs = {
  inputAmountUsd: BigNumber.Value
}

export const calculateFeeUsd = ({ inputAmountUsd }: CalculateFeeUsdArgs): BigNumber => {
  const feeBps = bn(DEFAULT_FEE_BPS)
  const feeUsd = bnOrZero(inputAmountUsd).times(feeBps.div(bn(10000)))

  return feeUsd
}
