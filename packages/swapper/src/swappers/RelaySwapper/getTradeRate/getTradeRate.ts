import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRateStep,
} from '../../../types'
import { getTrade } from '../getTradeQuote/getTradeQuote'
import type { RelayTradeRate } from '../utils/types'

export const getTradeRate = async (
  input: CommonTradeQuoteInput | GetTradeRateInput,
  deps: SwapperDeps,
  relayChainMap: Record<ChainId, number>,
): Promise<Result<RelayTradeRate[], SwapErrorRight>> => {
  const ratesResult = await getTrade({
    input,
    deps,
    relayChainMap,
  })

  return ratesResult.map(rates =>
    rates.map(rate => ({
      ...rate,
      quoteOrRate: 'rate' as const,
      steps: rate.steps.map(step => step) as [TradeRateStep] | [TradeRateStep, TradeRateStep],
    })),
  )
}
