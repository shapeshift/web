import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps } from '../../types'
import { SwapperName } from '../../types'
import type { ThorTradeRate, ThorTradeRateInput } from '../../utils/thorchain'
import { getPoolDetails, getThorL1TradeRate, TradeType } from '../../utils/thorchain'
import { assertValidTrade } from './utils'

export const getTradeRate = async (
  input: ThorTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<ThorTradeRate[], SwapErrorRight>> => {
  const { sellAsset, buyAsset } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const poolDetails = await getPoolDetails({
    buyAsset,
    sellAsset,
    url: `${deps.config.VITE_MAYACHAIN_NODE_URL}/mayachain/pools`,
    swapperName: SwapperName.Mayachain,
  })

  if (poolDetails.isErr()) return Err(poolDetails.unwrapErr())
  const { streamingInterval } = poolDetails.unwrap()

  return getThorL1TradeRate(input, deps, streamingInterval, TradeType.L1ToL1, SwapperName.Mayachain)
}
