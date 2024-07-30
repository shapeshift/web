import type { Result } from '@sniptt/monads/build'

import type {
  EvmTransactionRequest,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedEvmTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
} from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getPortalsTradeQuote } from './getPortalsTradeQuote/getPortalsTradeQuote'

export const portalsApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { config, assertGetEvmChainAdapter }: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getPortalsTradeQuote(
      input as GetEvmTradeQuoteInput,
      assertGetEvmChainAdapter,
      config,
    )

    return tradeQuoteResult.map(tradeQuote => {
      return [tradeQuote]
    })
  },

  // @ts-ignore TODO(gomes): implement me
  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    tradeQuote,
    supportsEIP1559, // @ts-ignore TODO(gomes): implement me
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {},

  checkTradeStatus: checkEvmSwapStatus,
}
