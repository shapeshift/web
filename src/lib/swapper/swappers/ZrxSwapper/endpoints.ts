import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads/build'
import type {
  EvmTransactionRequest,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedEvmTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  TradeQuote,
} from 'lib/swapper/types'
import { checkEvmSwapStatus } from 'lib/utils/evm'

import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import type { ZrxQuoteResponse } from './types'

const tradeQuoteMetadata: Map<string, ZrxQuoteResponse> = new Map()

export const zrxApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getZrxTradeQuote(input as GetEvmTradeQuoteInput)

    return tradeQuoteResult.map(({ tradeQuote, zrxQuoteResponse }) => {
      tradeQuoteMetadata.set(tradeQuote.id, zrxQuoteResponse)

      return [tradeQuote]
    })
  },

  getUnsignedEvmTransaction: ({
    chainId,
    from,
    tradeQuote,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const zrxQuoteResponse = tradeQuoteMetadata.get(tradeQuote.id)

    if (!zrxQuoteResponse) throw Error(`missing zrxQuoteResponse for quoteId ${tradeQuote.id}`)

    const { value, to, gasPrice, gas, data } = zrxQuoteResponse

    return Promise.resolve({
      to,
      from,
      value,
      data,
      chainId: Number(fromChainId(chainId).chainReference),
      gasLimit: gas,
      gasPrice,
    })
  },

  checkTradeStatus: checkEvmSwapStatus,
}
