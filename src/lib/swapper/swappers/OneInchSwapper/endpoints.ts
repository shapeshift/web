import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
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
import { v4 as uuid } from 'uuid'
import { checkEvmSwapStatus } from 'lib/utils/evm'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { fetchOneInchSwap } from './utils/fetchOneInchSwap'

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const oneInchApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input as GetEvmTradeQuoteInput)

    return tradeQuoteResult.map(tradeQuote => {
      const id = uuid()
      const firstHop = tradeQuote.steps[0]
      tradeQuoteMetadata.set(id, { chainId: firstHop.sellAsset.chainId as EvmChainId })
      return [tradeQuote]
    })
  },

  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    slippageTolerancePercentageDecimal,
    stepIndex,
    tradeQuote,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]

    const { receiveAddress, affiliateBps } = tradeQuote

    // TODO: pull all gas values from our node so we can use eip-1559
    const {
      tx: { value, to, gasPrice, gas, data },
    } = await fetchOneInchSwap({
      affiliateBps,
      buyAsset,
      receiveAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      maximumSlippageDecimalPercentage: slippageTolerancePercentageDecimal,
      sendAddress: from,
    })

    return {
      chainId: Number(fromChainId(chainId).chainReference),
      data,
      from,
      gasLimit: gas,
      gasPrice,
      to,
      value,
    }
  },

  checkTradeStatus: checkEvmSwapStatus,
}
