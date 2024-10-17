import { fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'

import type {
  EvmTransactionRequest,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedEvmTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuoteOrRate,
} from '../../types'
import { checkEvmSwapStatus, getHopByIndex } from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { fetchOneInchSwap } from './utils/fetchOneInchSwap'

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const oneInchApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeQuoteOrRate[], SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input as GetEvmTradeQuoteInput, deps)

    return tradeQuoteResult.map(tradeQuote => {
      const id = uuid()
      const firstHop = getHopByIndex(tradeQuote, 0)!
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
    supportsEIP1559,
    assertGetEvmChainAdapter,
    config,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const step = getHopByIndex(tradeQuote, stepIndex)

    if (!step) throw new Error(`No hop found for stepIndex ${stepIndex}`)

    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step

    const { receiveAddress, affiliateBps } = tradeQuote

    // TODO(gomes): when we actually split between TradeQuote and TradeRate in https://github.com/shapeshift/web/issues/7941,
    // this won't be an issue anymore
    if (!receiveAddress) throw new Error('receiveAddress is required for OneInchSwapper quotes')

    const {
      tx: { value, to, data },
    } = await fetchOneInchSwap({
      affiliateBps,
      buyAsset,
      receiveAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      maximumSlippageDecimalPercentage: slippageTolerancePercentageDecimal,
      sendAddress: from,
      config,
    })

    const feeData = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data,
      to,
      value,
      from,
      supportsEIP1559,
    })

    return {
      chainId: Number(fromChainId(chainId).chainReference),
      data,
      from,
      to,
      value,
      ...feeData,
    }
  },

  checkTradeStatus: checkEvmSwapStatus,
}
