import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { getTrade } from '../utils/getTrade'
import type { RelayTradeRateInput } from '../utils/types'

export const getTradeRate = (
  input: RelayTradeRateInput,
  deps: SwapperDeps,
  relayChainMap: Record<ChainId, number>,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  return getTrade({ input, deps, relayChainMap })
}
