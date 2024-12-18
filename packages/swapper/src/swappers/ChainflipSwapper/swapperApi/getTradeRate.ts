import type { GetTradeRateInput, SwapperDeps, TradeRateResult, TradeRateStep } from '../../../types'
import { getQuoteOrRate } from '../utils/getQuoteOrRate'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<TradeRateResult> => {
  const ratesResult = await getQuoteOrRate(input, deps)

  return ratesResult.map(rates =>
    rates.map(rate => ({
      ...rate,
      quoteOrRate: 'rate' as const,
      steps: rate.steps.map(step => step) as [TradeRateStep] | [TradeRateStep, TradeRateStep],
    })),
  )
}
