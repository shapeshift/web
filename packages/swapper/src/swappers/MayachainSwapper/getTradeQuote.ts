import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps } from '../../types'
import { SwapperName } from '../../types'
import type { ThorTradeQuote, ThorTradeQuoteInput } from '../../utils/thorchain'
import { getPoolDetails, getThorL1TradeQuote, TradeType } from '../../utils/thorchain'
import { assertValidTrade } from './utils'

export const getTradeQuote = async (
  input: ThorTradeQuoteInput,
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

  return getThorL1TradeQuote(
    input,
    deps,
    streamingInterval,
    TradeType.L1ToL1,
    SwapperName.Mayachain,
  )
}
