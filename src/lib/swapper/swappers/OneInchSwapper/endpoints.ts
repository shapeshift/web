import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  SwapperApi,
  TradeQuote,
} from 'lib/swapper/types'
import { assertGetEvmChainAdapter, checkEvmSwapStatus } from 'lib/utils/evm'

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

  getUnsignedTx: async ({
    from,
    slippageTolerancePercentageDecimal,
    tradeQuote,
    stepIndex,
  }: GetUnsignedTxArgs): Promise<ETHSignTx> => {
    const { accountNumber, buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]

    const { receiveAddress, affiliateBps } = tradeQuote

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const {
      tx: { value, to, gasPrice, gas, data },
    } = await fetchOneInchSwap({
      affiliateBps,
      buyAsset,
      receiveAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      maximumSlippageDecimalPercentage: slippageTolerancePercentageDecimal,
    })

    const buildSendApiTxInput = {
      value,
      to,
      from: from!,
      chainSpecific: {
        gasPrice,
        gasLimit: gas,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        data,
      },
      accountNumber,
    }
    return adapter.buildSendApiTransaction(buildSendApiTxInput)
  },

  checkTradeStatus: checkEvmSwapStatus,
}
