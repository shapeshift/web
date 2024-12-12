import type { ChainKey } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'

import type {
  GetEvmTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRateStep,
} from '../../../types'
import { getTrade } from '../getTradeQuote/getTradeQuote'
import type { LifiTradeRate } from '../utils/types'

export const getTradeRate = async (
  input: GetEvmTradeRateInput,
  deps: SwapperDeps,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<Result<LifiTradeRate[], SwapErrorRight>> => {
  const ratesResult = await getTrade({
    input,
    deps,
    lifiChainMap,
  })

  return ratesResult.map(rates =>
    rates.map(rate => ({
      ...rate,
      quoteOrRate: 'rate' as const,
      steps: rate.steps.map(step => ({ ...step, accountNumber: undefined })) as
        | [TradeRateStep]
        | [TradeRateStep, TradeRateStep],
    })),
  )
}
