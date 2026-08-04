import { assertUnreachable } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps } from '../../../types'
import { SwapperName } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { ThorTradeQuote, ThorTradeQuoteInput } from '../../../utils/thorchain'
import { getThorL1TradeQuote, TradeType } from '../../../utils/thorchain'
import { assertValidTrade } from '../utils/assertValidTrade'
import { getL1ToLongtailQuote } from '../utils/getL1ToLongtailQuote'
import { getLongtailToL1Quote } from '../utils/getLongtailQuote'

export const getTradeQuote = async (
  input: ThorTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const { sellAsset, buyAsset } = input

  const assertion = await assertValidTrade({ sellAsset, buyAsset, deps })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { tradeType, streamingInterval } = assertion.unwrap()

  switch (tradeType) {
    case TradeType.L1ToL1:
      return getThorL1TradeQuote(input, deps, streamingInterval, tradeType, SwapperName.Thorchain)
    case TradeType.LongTailToL1:
      return getLongtailToL1Quote(input, deps, streamingInterval, SwapperName.Thorchain)
    case TradeType.L1ToLongTail:
      if (!deps.config.VITE_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL) {
        return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
      }
      return getL1ToLongtailQuote(input, deps, streamingInterval, SwapperName.Thorchain)
    case TradeType.LongTailToLongTail:
      return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
    default:
      return assertUnreachable(tradeType)
  }
}
