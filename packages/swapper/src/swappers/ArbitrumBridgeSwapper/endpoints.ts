import type { ParentToChildMessageReader, ParentToChildMessageReaderClassic } from '@arbitrum/sdk'
import { ParentToChildMessageStatus, ParentTransactionReceipt } from '@arbitrum/sdk'
import type { Provider } from '@ethersproject/providers'
import type { AssetId } from '@shapeshiftoss/caip'
import { arbitrumChainId, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
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
export const getParentToChildMessageDataFromParentTxHash = async ({
  depositTxId,
  parentProvider,
  childProvider,
  isClassic, // optional: if we already know if tx is classic (eg. through subgraph) then no need to re-check in this fn
}: {
  depositTxId: string
  parentProvider: Provider
  childProvider: Provider
  isClassic?: boolean
}): Promise<
  | {
      isClassic?: boolean
      parentToChildMsg?: ParentToChildMessageReaderClassic | ParentToChildMessageReader
    }
  | undefined
> => {
  // fetch Parent transaction receipt
  const depositTxReceipt = await parentProvider.getTransactionReceipt(depositTxId)
  if (!depositTxReceipt) return

  const parentTxReceipt = new ParentTransactionReceipt(depositTxReceipt)

  // classic (pre-nitro) handling
  const getClassicDepositMessage = async () => {
    const [parentToChildMsg] = await parentTxReceipt.getParentToChildMessagesClassic(childProvider)
    return {
      isClassic: true,
      parentToChildMsg,
    }
  }

  // post-nitro handling
  const getNitroDepositMessage = async () => {
    const [parentToChildMsg] = await parentTxReceipt.getParentToChildMessages(childProvider)
    return {
      isClassic: false,
      parentToChildMsg,
    }
  }

  // if it is unknown whether the transaction isClassic or not, fetch the result
  const safeIsClassic = isClassic ?? (await parentTxReceipt.isClassic(childProvider))

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
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const step = getHopByIndex(tradeQuote, stepIndex)
    if (!step) throw new Error(`No hop found for stepIndex ${stepIndex}`)

    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step
    const { receiveAddress } = tradeQuote

    const assertion = await assertValidTrade({ buyAsset, sellAsset })
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
    })

    const { request } = swap

    if (!request) throw new Error('No request data found')

    const {
      txRequest: { data, value, to },
    } = request

    const feeData = await evm.getFees({
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
      // We don't want to be polling for 7 days for Arb Child -> Parent, that's not very realistic for users.
      // We simply return success when the Child Tx is confirmed, meaning the trade will show "complete" almost instantly
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
        message: 'Parent Tx Pending',
      }
    }

    const parentProvider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
    const childProvider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)
    const maybeParentToChildMessageData = await getParentToChildMessageDataFromParentTxHash({
      depositTxId: txHash,
      parentProvider,
      childProvider,
    })
    const maybeParentToChildMsg = maybeParentToChildMessageData?.parentToChildMsg
    const maybeBuyTxHash = await (async () => {
      if (!maybeParentToChildMsg) return

      if (maybeParentToChildMessageData?.isClassic) {
        const msg = maybeParentToChildMsg as ParentToChildMessageReaderClassic
        const receipt = await msg.getRetryableCreationReceipt()
        if (receipt?.status !== ParentToChildMessageStatus.REDEEMED) return
        return receipt.transactionHash
      } else {
        const msg = maybeParentToChildMsg as ParentToChildMessageReader
        const successfulRedeem = await msg.getSuccessfulRedeem()
        if (successfulRedeem.status !== ParentToChildMessageStatus.REDEEMED) return
        return successfulRedeem.childTxReceipt.transactionHash
      }
    })()

    if (!maybeBuyTxHash) {
      return {
        status: TxStatus.Pending,
        buyTxHash: maybeBuyTxHash,
        message: 'Parent Tx confirmed, waiting for Child',
      }
    }

    const childTxStatus = await checkEvmSwapStatus({
      txHash: maybeBuyTxHash,
      chainId: arbitrumChainId,
      assertGetEvmChainAdapter,
      accountId,
      fetchIsSmartContractAddressQuery,
    })

    // i.e Unknown is perfectly valid since ETH deposits Child Txids are available immediately deterministically, but will only be in the mempool after ~10mn
    if (childTxStatus.status === TxStatus.Pending || childTxStatus.status === TxStatus.Unknown) {
      return {
        status: TxStatus.Pending,
        buyTxHash: maybeBuyTxHash,
        message: 'Child Tx Pending',
      }
    }

    return {
      status: TxStatus.Confirmed,
      buyTxHash: maybeBuyTxHash,
      message: undefined,
    }
  },
}
