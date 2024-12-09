import type { ChainKey } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'

import type { GetEvmTradeRateInput, SwapErrorRight, SwapperDeps } from '../../../types'
import { getTrade } from '../getTradeQuote/getTradeQuote'
import type { LifiTradeRate } from '../utils/types'

export const getTradeRate = async (
  input: GetEvmTradeRateInput,
  deps: SwapperDeps,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<Result<LifiTradeRate[], SwapErrorRight>> => {
  const rate = (await getTrade({
    input,
    deps,
    lifiChainMap,
  })) as unknown as Result<LifiTradeRate[], SwapErrorRight>
  return rate
}
