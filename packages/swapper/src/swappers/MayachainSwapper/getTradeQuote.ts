import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { GetTradeQuoteInput, SwapErrorRight, SwapperDeps } from '../../types'
import { SwapperName } from '../../types'
import type { ThorTradeQuote } from '../../utils/thorchain'
import { getL1RateOrQuote, getPoolDetails, TradeType } from '../../utils/thorchain'
import { assertValidTrade } from './utils'

export const getTradeQuote = async (
  input: GetTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
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

  return getL1RateOrQuote<ThorTradeQuote>(
    input,
    deps,
    streamingInterval,
    TradeType.L1ToL1,
    SwapperName.Mayachain,
  )
}
