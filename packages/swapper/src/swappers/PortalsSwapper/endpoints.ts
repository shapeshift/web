import type { Result } from '@sniptt/monads/build'

import type {
  EvmTransactionRequest,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedEvmTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  TradeQuote,
} from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getPortalsTradeQuote } from './getPortalsTradeQuote/getPortalsTradeQuote'

export const portalsApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getPortalsTradeQuote(input as GetEvmTradeQuoteInput)

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
