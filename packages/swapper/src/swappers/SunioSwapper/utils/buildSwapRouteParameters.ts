import { bn } from '@shapeshiftoss/utils'

import type { SunioRoute } from '../types'

export type SwapRouteParameters = {
  path: string[]
  poolVersion: string[]
  versionLen: number[]
  fees: number[]
  swapData: {
    amountIn: string
    amountOutMin: string
    recipient: string
    deadline: number
  }
}

export const buildSwapRouteParameters = (
  route: SunioRoute,
  sellAmountCryptoBaseUnit: string,
  minBuyAmountCryptoBaseUnit: string,
  recipient: string,
  slippageTolerancePercentageDecimal: string,
): SwapRouteParameters => {
  const path = route.tokens

  const poolVersion = route.poolVersions

  const versionLen = poolVersion.map((_, index) => {
    if (index === poolVersion.length - 1) {
      return path.length - index
    }
    return 2
  })

  const fees = route.poolFees.map(fee => Number(fee))

  const amountOutWithSlippage = bn(minBuyAmountCryptoBaseUnit)
    .times(bn(1).minus(slippageTolerancePercentageDecimal))
    .toFixed(0)

  const swapData = {
    amountIn: sellAmountCryptoBaseUnit,
    amountOutMin: amountOutWithSlippage,
    recipient,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
  }

  return {
    path,
    poolVersion,
    versionLen,
    fees,
    swapData,
  }
}
