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
import { checkEvmSwapStatus } from 'lib/utils/evm'

import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { fetchFromZrx } from './utils/fetchFromZrx'

export const zrxApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getZrxTradeQuote(input as GetEvmTradeQuoteInput)

    return tradeQuoteResult.map(tradeQuote => {
      return [tradeQuote]
    })
  },

  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    tradeQuote,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const { affiliateBps, receiveAddress, slippageTolerancePercentage, steps } = tradeQuote
    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = steps[0]

    // We need to re-fetch the quote from 0x here because actual quote fetches include validation of
    // approvals, which prevent quotes during trade input from succeeding if the user hasn't already
    // approved the token they are getting a quote for.
    // TODO: we'll want to let users know if the quoted amounts change much after re-fetching
    const zrxQuoteResponse = await fetchFromZrx({
      priceOrQuote: 'quote',
      buyAsset,
      sellAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      receiveAddress,
      affiliateBps: affiliateBps ?? '0',
      slippageTolerancePercentage,
    })

    if (zrxQuoteResponse.isErr()) throw zrxQuoteResponse.unwrapErr()

    const { value, to, gasPrice, gas, data } = zrxQuoteResponse.unwrap()

    return {
      to,
      from,
      value,
      data,
      chainId: Number(fromChainId(chainId).chainReference),
      gasLimit: gas,
      gasPrice,
    }
  },

  checkTradeStatus: checkEvmSwapStatus,
}
