import type { ParentToChildMessageReader, ParentToChildMessageReaderClassic } from '@arbitrum/sdk'
import { ParentToChildMessageStatus, ParentTransactionReceipt } from '@arbitrum/sdk'
import type { AssetId } from '@shapeshiftoss/caip'
import { arbitrumChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import type { EvmChainId } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { ethers as ethersv5 } from 'ethers5'

import type { GetEvmTradeQuoteInputBase, GetEvmTradeRateInput, SwapperApi } from '../../types'
import {
  checkEvmSwapStatus,
  getExecutableTradeStep,
  getHopByIndex,
  isExecutableTradeQuote,
} from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { fetchArbitrumBridgeQuote } from './utils/fetchArbitrumBridgeSwap'
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
  parentProvider: ethersv5.providers.JsonRpcProvider
  childProvider: ethersv5.providers.JsonRpcProvider
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
  getTradeQuote: async (input, deps) => {
    const tradeQuoteResult = await getTradeQuote(input as GetEvmTradeQuoteInputBase, deps)

    return tradeQuoteResult.map(tradeQuote => {
      const id = tradeQuote.id
      const firstHop = getHopByIndex(tradeQuote, 0)
      if (!firstHop) {
        console.error('No first hop found in trade quote')
        return []
      }
      tradeQuoteMetadata.set(id, {
        sellAssetId: firstHop.sellAsset.assetId,
        chainId: firstHop.sellAsset.chainId as EvmChainId,
      })
      return [tradeQuote]
    })
  },
  getTradeRate: async (input, deps) => {
    const tradeRateResult = await getTradeRate(input as GetEvmTradeRateInput, deps)

    return tradeRateResult.map(tradeRate => {
      const id = tradeRate.id
      const firstHop = getHopByIndex(tradeRate, 0)
      if (!firstHop) {
        console.error('No first hop found in trade rate')
        return []
      }

      tradeQuoteMetadata.set(id, {
        sellAssetId: firstHop.sellAsset.assetId,
        chainId: firstHop.sellAsset.chainId as EvmChainId,
      })
      return [tradeRate]
    })
  },
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const { receiveAddress } = tradeQuote

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      step

    const assertion = await assertValidTrade({ buyAsset, sellAsset })
    if (assertion.isErr()) throw new Error(assertion.unwrapErr().message)

    const swap = await fetchArbitrumBridgeQuote({
      chainId: sellAsset.chainId,
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

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({
      adapter,
      data: data.toString(),
      to,
      value: value.toString(),
      from,
      supportsEIP1559,
    })

    return adapter.buildCustomApiTx({
      accountNumber,
      data: data.toString(),
      from,
      to,
      value: value.toString(),
      ...feeData,
    })
  },
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const { receiveAddress } = tradeQuote

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = step

    const assertion = await assertValidTrade({ buyAsset, sellAsset })
    if (assertion.isErr()) throw new Error(assertion.unwrapErr().message)

    const swap = await fetchArbitrumBridgeQuote({
      chainId: sellAsset.chainId,
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

    const { networkFeeCryptoBaseUnit } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(sellAsset.chainId),
      data: data.toString(),
      to,
      value: value.toString(),
      from,
      supportsEIP1559,
    })

    return networkFeeCryptoBaseUnit
  },
  checkTradeStatus: async ({
    txHash,
    chainId,
    assertGetEvmChainAdapter,
    address,
    fetchIsSmartContractAddressQuery,
  }) => {
    const swapTxStatus = await checkEvmSwapStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      address,
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
      address,
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
