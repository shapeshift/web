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

  // The SmartExchangeRouter expects sum(versionLen) === path.length: the first
  // pool segment consumes 2 tokens (input + output) and each subsequent pool
  // reuses the previous output, consuming 1 new token. This relies on the Sun.io
  // API returning poolVersions per-hop (poolVersions.length === tokens.length - 1),
  // which it does — the router also accepts this un-collapsed form for same-version hops.
  const versionLen = poolVersion.map((_, index) => (index === 0 ? 2 : 1))

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
