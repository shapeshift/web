import type BigNumber from 'bignumber.js'
import { bn } from 'lib/bignumber/bignumber'

import type { OneInchBaseResponse } from './types'

export const getRate = (quoteResponse: OneInchBaseResponse): BigNumber => {
  const fromTokenAmountDecimal = bn(quoteResponse.fromTokenAmount).div(
    bn(10).pow(quoteResponse.fromToken.decimals),
  )
  const toTokenAmountDecimal = bn(quoteResponse.toTokenAmount).div(
    bn(10).pow(quoteResponse.toToken.decimals),
  )
  return toTokenAmountDecimal.div(fromTokenAmountDecimal)
}
