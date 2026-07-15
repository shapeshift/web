import type { Result } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { getTrade } from '../utils/getTrade'
import type { AcrossTradeRateInput } from '../utils/types'

export const getTradeRate = (
  input: AcrossTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  return getTrade({ input, deps })
}
