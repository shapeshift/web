import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'

import type {
  GetTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
  TradeRateStep,
} from '../../../types'
import { getRelayTradeRate } from '../utils/getTrade'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
  relayChainMap: Record<ChainId, number>,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const args = {
    quoteOrRate: 'rate' as const,
    buyAsset: input.buyAsset,
    receiveAddress: input.receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit:
      input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sellAsset: input.sellAsset,
    sendAddress: input.sendAddress,
    accountNumber: input.accountNumber,
    affiliateBps: input.affiliateBps,
    potentialAffiliateBps: input.potentialAffiliateBps,
  }

  const ratesResult = await getRelayTradeRate(args, deps, relayChainMap)

  return ratesResult.map(rates =>
    rates.map(rate => ({
      ...rate,
      quoteOrRate: 'rate' as const,
      steps: rate.steps.map(step => step) as [TradeRateStep] | [TradeRateStep, TradeRateStep],
    })),
  )
}
