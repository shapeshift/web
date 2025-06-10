import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { ThorTradeRate } from '../../thorchain-utils'
import { getL1RateOrQuote, getPoolDetails, TradeType } from '../../thorchain-utils'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps } from '../../types'
import { SwapperName } from '../../types'
import { assertValidTrade } from './utils'

export const getTradeRate = async (
  input: GetTradeRateInput,
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

  return getL1RateOrQuote<ThorTradeRate>(
    input,
    deps,
    streamingInterval,
    TradeType.L1ToL1,
    SwapperName.Mayachain,
  )
}
