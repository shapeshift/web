import type { L1ToL2MessageReader, L1ToL2MessageReaderClassic } from '@arbitrum/sdk'
import { L1ToL2MessageStatus, L1TransactionReceipt } from '@arbitrum/sdk'
import type { Provider } from '@ethersproject/providers'
import type { AssetId } from '@shapeshiftoss/caip'
import { arbitrumChainId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { getFees } from '@shapeshiftoss/utils/dist/evm'
import type { Result } from '@sniptt/monads/build'
import type { InterpolationOptions } from 'node-polyglot'

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
import { checkEvmSwapStatus, getHopByIndex } from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { fetchArbitrumBridgeSwap } from './utils/fetchArbitrumBridgeSwap'
import { assertValidTrade } from './utils/helpers'

const tradeQuoteMetadata: Map<string, { sellAssetId: AssetId; chainId: EvmChainId }> = new Map()

// https://github.com/OffchainLabs/arbitrum-token-bridge/blob/d17c88ef3eef3f4ffc61a04d34d50406039f045d/packages/arb-token-bridge-ui/src/util/deposits/helpers.ts#L268
export const getL1ToL2MessageDataFromL1TxHash = async ({
  depositTxId,
  l1Provider,
  l2Provider,
  isClassic, // optional: if we already know if tx is classic (eg. through subgraph) then no need to re-check in this fn
}: {
  depositTxId: string
  l1Provider: Provider
  l2Provider: Provider
  isClassic?: boolean
}): Promise<
  | {
      isClassic?: boolean
      l1ToL2Msg?: L1ToL2MessageReaderClassic | L1ToL2MessageReader
    }
  | undefined
> => {
  // fetch L1 transaction receipt
  const depositTxReceipt = await l1Provider.getTransactionReceipt(depositTxId)
  if (!depositTxReceipt) return

  const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)

  // classic (pre-nitro) handling
  const getClassicDepositMessage = async () => {
    const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2MessagesClassic(l2Provider)
    return {
      isClassic: true,
      l1ToL2Msg,
    }
  }

  // post-nitro handling
  const getNitroDepositMessage = async () => {
    const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2Messages(l2Provider)
    return {
      isClassic: false,
      l1ToL2Msg,
    }
  }

  // if it is unknown whether the transaction isClassic or not, fetch the result
  const safeIsClassic = isClassic ?? (await l1TxReceipt.isClassic(l2Provider))

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
    deps: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input as GetEvmTradeQuoteInput, deps)

    return tradeQuoteResult.map(tradeQuote => {
      const id = tradeQuote.id
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
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
    getEthersV5Provider,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const step = getHopByIndex(tradeQuote, stepIndex)
    if (!step) throw new Error(`No hop found for stepIndex ${stepIndex}`)

    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step
    const { receiveAddress } = tradeQuote

    const assertion = await assertValidTrade({ buyAsset, sellAsset, getEthersV5Provider })
    if (assertion.isErr()) throw new Error(assertion.unwrapErr().message)

    const swap = await fetchArbitrumBridgeSwap({
      chainId,
      supportsEIP1559,
      buyAsset,
      receiveAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      sendAddress: from,
      assertGetEvmChainAdapter,
      getEthersV5Provider,
    })

    const { request } = swap

    if (!request) throw new Error('No request data found')

    const {
      txRequest: { data, value, to },
    } = request

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
    assertGetEvmChainAdapter,
    getEthersV5Provider,
    accountId,
    fetchIsSmartContractAddressQuery,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    const swapTxStatus = await checkEvmSwapStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      accountId,
      fetchIsSmartContractAddressQuery,
    })
    const isWithdraw = chainId === arbitrumChainId

    if (isWithdraw) {
      // We don't want to be polling for 7 days for Arb L2 -> L1, that's not very realistic for users.
      // We simply return success when the L2 Tx is confirmed, meaning the trade will show "complete" almost instantly
      // and will handle the whole 7 days thing (that the user should've already been warned about with an ack before previewing)
      // at confirm step
      return {
        ...swapTxStatus,
        // Note, we don't care about the buyTxHash here, since it will be available... in 7 days.
        buyTxHash: undefined,
      }
    }

    if (swapTxStatus.status === TxStatus.Pending || swapTxStatus.status === TxStatus.Unknown) {
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
      l1Provider,
      l2Provider,
    })
    const maybeL1ToL2Msg = maybeL1ToL2MessageData?.l1ToL2Msg
    const maybeBuyTxHash = await (async () => {
      if (!maybeL1ToL2Msg) return

      if (maybeL1ToL2MessageData?.isClassic) {
        const msg = maybeL1ToL2Msg as L1ToL2MessageReaderClassic
        const receipt = await msg.getRetryableCreationReceipt()
        if (receipt?.status !== L1ToL2MessageStatus.REDEEMED) return
        return receipt.transactionHash
      } else {
        const msg = maybeL1ToL2Msg as L1ToL2MessageReader
        const successfulRedeem = await msg.getSuccessfulRedeem()
        if (successfulRedeem.status !== L1ToL2MessageStatus.REDEEMED) return
        return successfulRedeem.l2TxReceipt.transactionHash
      }
    })()

    if (!maybeBuyTxHash) {
      return {
        status: TxStatus.Pending,
        buyTxHash: maybeBuyTxHash,
        message: 'L1 Tx confirmed, waiting for L2',
      }
    }

    const l2TxStatus = await checkEvmSwapStatus({
      txHash: maybeBuyTxHash,
      chainId: arbitrumChainId,
      assertGetEvmChainAdapter,
      accountId,
      fetchIsSmartContractAddressQuery,
    })

    // i.e Unknown is perfectly valid since ETH deposits L2 Txids are available immediately deterministically, but will only be in the mempool after ~10mn
    if (l2TxStatus.status === TxStatus.Pending || l2TxStatus.status === TxStatus.Unknown) {
      return {
        status: TxStatus.Pending,
        buyTxHash: maybeBuyTxHash,
        message: 'L2 Tx Pending',
      }
    }

    return {
      status: TxStatus.Confirmed,
      buyTxHash: maybeBuyTxHash,
      message: undefined,
    }
  },
}
