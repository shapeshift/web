import { type L1ToL2MessageReaderClassic, L1TransactionReceipt } from '@arbitrum/sdk'
import type {
  EthDepositMessage,
  L1ToL2MessageReader,
} from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'
import type { Provider } from '@ethersproject/providers'
import type { AssetId } from '@shapeshiftoss/caip'
import { arbitrumChainId, ethAssetId, fromChainId } from '@shapeshiftoss/caip'
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
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import { assertGetEvmChainAdapter, checkEvmSwapStatus, getFees } from 'lib/utils/evm'
import { getHopByIndex } from 'state/slices/tradeQuoteSlice/helpers'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { fetchArbitrumBridgeSwap } from './utils/fetchArbitrumBridgeSwap'

const L1_TX_CONFIRMATION_TIME_MS = 15 * 60 * 1000 // 15 minutes in milliseconds
const startTimeMap: Map<string, number> = new Map()

const tradeQuoteMetadata: Map<string, { sellAssetId: AssetId; chainId: EvmChainId }> = new Map()

// https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/deposits/helpers.ts#L268
export const getL1ToL2MessageDataFromL1TxHash = async ({
  depositTxId,
  isEthDeposit,
  l1Provider,
  l2Provider,
  isClassic, // optional: if we already know if tx is classic (eg. through subgraph) then no need to re-check in this fn
}: {
  depositTxId: string
  l1Provider: Provider
  isEthDeposit: boolean
  l2Provider: Provider
  isClassic?: boolean
}): Promise<
  | {
      isClassic?: boolean
      l1ToL2Msg?: L1ToL2MessageReaderClassic | EthDepositMessage | L1ToL2MessageReader
    }
  | undefined
> => {
  // fetch L1 transaction receipt
  const depositTxReceipt = await l1Provider.getTransactionReceipt(depositTxId)

  if (!depositTxReceipt) {
    return undefined
  }

  const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)

  const getClassicDepositMessage = async () => {
    const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2MessagesClassic(l2Provider)
    return {
      isClassic: true,
      l1ToL2Msg,
    }
  }

  const getNitroDepositMessage = async () => {
    // post-nitro handling
    if (isEthDeposit) {
      // nitro eth deposit
      const [ethDepositMessage] = await l1TxReceipt.getEthDeposits(l2Provider)
      return {
        isClassic: false,
        l1ToL2Msg: ethDepositMessage,
      }
    }

    // Else, nitro token deposit
    const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2Messages(l2Provider)
    return {
      isClassic: false,
      l1ToL2Msg,
    }
  }

  const safeIsClassic = isClassic ?? (await l1TxReceipt.isClassic(l2Provider)) // if it is unknown whether the transaction isClassic or not, fetch the result

  if (safeIsClassic) {
    // classic (pre-nitro) deposit - both eth + token
    return getClassicDepositMessage()
  }

  // post-nitro deposit - both eth + token
  return getNitroDepositMessage()
}

export const arbitrumBridgeApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input as GetEvmTradeQuoteInput)

    return tradeQuoteResult.map(tradeQuote => {
      const id = uuid()
      const firstHop = getHopByIndex(tradeQuote, 0)!
      tradeQuoteMetadata.set(id, {
        sellAssetId: firstHop.sellAsset.assetId,
        chainId: firstHop.sellAsset.chainId as EvmChainId,
      })
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
    quoteId,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | undefined
  }> => {
    const sellAssetId = tradeQuoteMetadata.get(quoteId)?.sellAssetId ?? ''
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

    const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
    const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)
    const maybeL1ToL2MessageData = await getL1ToL2MessageDataFromL1TxHash({
      depositTxId: txHash,
      isEthDeposit: sellAssetId === ethAssetId,
      l1Provider,
      l2Provider,
    })
    const maybeL1ToL2Msg = maybeL1ToL2MessageData?.l1ToL2Msg
    const maybeBuyTxHash = (maybeL1ToL2Msg as EthDepositMessage | undefined)?.l2DepositTxHash

    if (swapTxStatus.status === TxStatus.Confirmed) {
      const timeElapsed = Date.now() - startTime

      if (timeElapsed < L1_TX_CONFIRMATION_TIME_MS) {
        return {
          status: TxStatus.Pending,
          buyTxHash: maybeBuyTxHash,
          message: 'L1 Tx confirmed, waiting for L2',
        }
      }

      return {
        status: TxStatus.Confirmed,
        buyTxHash: maybeBuyTxHash,
        message: undefined,
      }
    }

    return swapTxStatus
  },
}
