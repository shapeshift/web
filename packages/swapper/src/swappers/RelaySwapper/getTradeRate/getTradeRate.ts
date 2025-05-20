import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'

import type {
  GetTradeRateInput,
  GetUtxoTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { getTrade } from '../utils/getTrade'

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
    xpub: 'xpub' in input ? (input as GetUtxoTradeRateInput).xpub : undefined,
  }

  const ratesResult = await getTrade({ input: args, deps, relayChainMap })

  return ratesResult
}
