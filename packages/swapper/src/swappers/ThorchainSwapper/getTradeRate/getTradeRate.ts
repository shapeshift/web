import { assertUnreachable } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps } from '../../../types'
import { SwapperName } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { ThorTradeRate, ThorTradeRateInput } from '../../../utils/thorchain'
import { getThorL1TradeRate, TradeType } from '../../../utils/thorchain'
import { assertValidTrade } from '../utils/assertValidTrade'
import { getL1ToLongtailRate } from '../utils/getL1ToLongtailRate'
import { getLongtailToL1Rate } from '../utils/getLongtailRate'

export const getTradeRate = async (
  input: ThorTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<ThorTradeRate[], SwapErrorRight>> => {
  const { sellAsset, buyAsset } = input

  const assertion = await assertValidTrade({ sellAsset, buyAsset, deps })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { tradeType, streamingInterval } = assertion.unwrap()

  switch (tradeType) {
    case TradeType.L1ToL1:
      return getThorL1TradeRate(input, deps, streamingInterval, tradeType, SwapperName.Thorchain)
    case TradeType.LongTailToL1:
      return getLongtailToL1Rate(input, deps, streamingInterval, SwapperName.Thorchain)
    case TradeType.L1ToLongTail:
      if (!deps.config.VITE_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL) {
        return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
      }
      return getL1ToLongtailRate(input, deps, streamingInterval, SwapperName.Thorchain)
    case TradeType.LongTailToLongTail:
      return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
    default:
      return assertUnreachable(tradeType)
  }
}
