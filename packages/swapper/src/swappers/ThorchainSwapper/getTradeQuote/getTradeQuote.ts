import { assertUnreachable } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { ThorTradeQuote } from '../../../thorchain-utils'
import { getL1RateOrQuote, getPoolDetails, TradeType } from '../../../thorchain-utils'
import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { THORCHAIN_SUPPORTED_CHAIN_IDS } from '../constants'
import { getL1ToLongtailQuote } from '../utils/getL1ToLongtailQuote'
import { getLongtailToL1Quote } from '../utils/getLongtailQuote'
import { getTradeType } from '../utils/longTailHelpers'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const thorchainSwapLongtailEnabled = deps.config.VITE_FEATURE_THORCHAINSWAP_LONGTAIL
  const thorchainSwapL1ToLongtailEnabled = deps.config.VITE_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL
  const { sellAsset, buyAsset } = input

  if (
    !THORCHAIN_SUPPORTED_CHAIN_IDS.sell.includes(sellAsset.chainId) ||
    !THORCHAIN_SUPPORTED_CHAIN_IDS.buy.includes(buyAsset.chainId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: 'Unsupported chain',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  const poolDetails = await getPoolDetails({
    buyAsset,
    sellAsset,
    url: `${deps.config.VITE_THORCHAIN_NODE_URL}/thorchain/pools`,
    swapperName: SwapperName.Thorchain,
  })

  if (poolDetails.isErr()) return Err(poolDetails.unwrapErr())
  const { buyPool, buyPoolId, sellPool, sellPoolId, streamingInterval } = poolDetails.unwrap()

  const tradeType = thorchainSwapLongtailEnabled
    ? getTradeType(sellPool, buyPool, sellPoolId, buyPoolId)
    : TradeType.L1ToL1

  if (tradeType === undefined) {
    return Err(
      makeSwapErrorRight({
        message: 'Unknown trade type',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (
    (!buyPoolId && tradeType !== TradeType.L1ToLongTail) ||
    (!sellPoolId && tradeType !== TradeType.LongTailToL1)
  ) {
    return Err(
      makeSwapErrorRight({
        message: 'Unsupported trade pair',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  switch (tradeType) {
    case TradeType.L1ToL1:
      return getL1RateOrQuote<ThorTradeQuote>(input, deps, streamingInterval, SwapperName.Thorchain)
    case TradeType.LongTailToL1:
      return getLongtailToL1Quote(input, deps, streamingInterval, SwapperName.Thorchain)
    case TradeType.L1ToLongTail:
      if (!thorchainSwapL1ToLongtailEnabled) {
        return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
      }
      return getL1ToLongtailQuote(input, deps, streamingInterval, SwapperName.Thorchain)
    case TradeType.LongTailToLongTail:
      return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
    default:
      return assertUnreachable(tradeType)
  }
}
