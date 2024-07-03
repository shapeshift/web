import { fromChainId } from '@shapeshiftoss/caip'
import type {
  EvmTransactionRequest,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedEvmTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  TradeQuote,
} from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads/build'
import { BigNumber } from 'lib/bignumber/bignumber'
import { assertGetEvmChainAdapter, checkEvmSwapStatus, getFees } from 'lib/utils/evm'

import { getPortalsTradeQuote } from './getPortalsTradeQuote/getPortalsTradeQuote'

export const portalsApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    debugger
    const tradeQuoteResult = await getPortalsTradeQuote(input as GetEvmTradeQuoteInput)

    return tradeQuoteResult.map(tradeQuote => {
      return [tradeQuote]
    })
  },

  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    tradeQuote,
    supportsEIP1559,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    // TODO(gomes): implement me
  },

  checkTradeStatus: checkEvmSwapStatus,
}
