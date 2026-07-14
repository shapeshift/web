import type { Result } from '@sniptt/monads'

import type { GetEvmTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { getTrade } from '../utils/getTrade'

export const getTradeRate = (
  input: GetEvmTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  return getTrade({ input, deps })
}
