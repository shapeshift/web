import type { ChainId } from '@shapeshiftoss/caip'
import { arbitrumChainId, fromChainId } from '@shapeshiftoss/caip'
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
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import { assertGetEvmChainAdapter, checkEvmSwapStatus, getFees } from 'lib/utils/evm'
import { getHopByIndex } from 'state/slices/tradeQuoteSlice/helpers'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { fetchArbitrumBridgeSwap } from './utils/fetchArbitrumBridgeSwap'

const L1_TX_CONFIRMATION_TIME_MS = 15 * 60 * 1000 // 15 minutes in milliseconds
const startTimeMap: Map<string, number> = new Map()

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const arbitrumBridgeApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input as GetEvmTradeQuoteInput)

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
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const step = getHopByIndex(tradeQuote, stepIndex)

    if (!step) throw new Error(`No hop found for stepIndex ${stepIndex}`)

    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step

    const { receiveAddress, affiliateBps } = tradeQuote

    const swap = await fetchArbitrumBridgeSwap({
      affiliateBps,
      buyAsset,
      receiveAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      maximumSlippageDecimalPercentage: slippageTolerancePercentageDecimal,
      sendAddress: from,
    })

    const {
      txRequest: { data, value, to },
    } = swap

    const feeData = await getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data: data.toString(),
      to,
      value: value.toString(),
      from,
      supportsEIP1559,
    })

    return {
      chainId: Number(fromChainId(chainId).chainReference),
      data: data.toString(),
      from,
      to,
      value: value.toString(),
      ...feeData,
    }
  },

  checkTradeStatus: async ({
    txHash,
    chainId,
  }: {
    txHash: string
    chainId: ChainId
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | undefined
  }> => {
    const swapTxStatus = await checkEvmSwapStatus({ txHash, chainId })
    const isWithdraw = chainId === arbitrumChainId

    if (isWithdraw) {
      // We don't want to be polling for 7 days for Arb L2 -> L1, that's not very realistic for users.
      // We simply return success when the L2 Tx is confirmed, meaning the trade will show "complete" almost instantly
      // and will handle the whole 7 days thing (that the user should've already been warned about with an ack before previewing)
      // at confirm step
      return swapTxStatus
    }

    let startTime = startTimeMap.get(txHash)
    if (!startTime) {
      startTime = Date.now()
      startTimeMap.set(txHash, startTime)
    }

    if (swapTxStatus.status === TxStatus.Pending) {
      return {
        status: TxStatus.Pending,
        buyTxHash: undefined,
        message: 'L1 Tx Pending',
      }
    }

    if (swapTxStatus.status === TxStatus.Confirmed) {
      const timeElapsed = Date.now() - startTime

      if (timeElapsed < L1_TX_CONFIRMATION_TIME_MS) {
        return {
          status: TxStatus.Pending,
          // TODO(gomes): getL1ToL2MessageDataFromL1TxHash here and return the right txHash
          buyTxHash: undefined,
          message: 'L1 Tx confirmed, waiting for L2',
        }
      }
    }

    // TODO(gomes): buyTxHash too, but TxStatus.confirmed
    return swapTxStatus
  },
}
