import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type { SwapperApi, TradeStatus } from '../../types'
import {
  createDefaultStatusResponse,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { getNearIntentsStatusMessage, mapNearIntentsStatus } from './utils/helpers/helpers'
import { initializeOneClickService, OneClickService } from './utils/oneClickService'

export const nearIntentsApi: SwapperApi = {
  getTradeQuote,
  getTradeRate: (input, deps) => {
    return getTradeRate(input, deps)
  },

  // Build unsigned EVM transaction to deposit address
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, nearIntentsSpecific } = step
    if (!nearIntentsSpecific) throw new Error('nearIntentsSpecific is required')

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId as EvmChainId)

    const to = nearIntentsSpecific.depositAddress
    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
    const data = evm.getErc20Data(to, value, contractAddress)

    const feeData = await evm.getFees({
      adapter,
      data: data || '0x',
      to: contractAddress ?? to,
      value: isNativeEvmAsset(sellAsset.assetId) ? value : '0',
      from,
      supportsEIP1559,
    })

    return adapter.buildSendApiTransaction({
      accountNumber,
      from,
      to,
      value,
      chainSpecific: { contractAddress, ...feeData },
    })
  },

  // Get EVM transaction fees for deposit
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, nearIntentsSpecific } = step
    if (!nearIntentsSpecific) throw new Error('nearIntentsSpecific is required')

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId as EvmChainId)

    const to = nearIntentsSpecific.depositAddress
    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
    const data = evm.getErc20Data(to, value, contractAddress)

    const feeData = await evm.getFees({
      adapter,
      data: data || '0x',
      to: contractAddress ?? to,
      value: isNativeEvmAsset(sellAsset.assetId) ? value : '0',
      from,
      supportsEIP1559,
    })

    return feeData.networkFeeCryptoBaseUnit
  },

  // Build unsigned UTXO transaction to deposit address
  getUnsignedUtxoTransaction: ({ stepIndex, tradeQuote, assertGetUtxoChainAdapter, xpub }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, accountNumber, nearIntentsSpecific } = step
    if (!nearIntentsSpecific) throw new Error('nearIntentsSpecific is required')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    return adapter.buildSendApiTransaction({
      accountNumber,
      to: nearIntentsSpecific.depositAddress,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sendMax: false,
      chainSpecific: {
        satoshiPerByte: '0',
        accountType: UtxoAccountType.SegwitNative,
      },
      xpub,
    })
  },

  // Get UTXO transaction fees for deposit
  getUtxoTransactionFees: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  // Build unsigned Solana transaction to deposit address
  getUnsignedSolanaTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetSolanaChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, nearIntentsSpecific } = step
    if (!nearIntentsSpecific) throw new Error('nearIntentsSpecific is required')

    const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

    const to = nearIntentsSpecific.depositAddress
    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const tokenId = contractAddressOrUndefined(sellAsset.assetId)

    const { fast } = await adapter.getFeeData({
      to,
      value,
      chainSpecific: { from, tokenId },
    })

    return adapter.buildSendApiTransaction({
      to,
      from,
      value,
      accountNumber,
      chainSpecific: {
        tokenId,
        computeUnitLimit: fast.chainSpecific.computeUnits,
        computeUnitPrice: fast.chainSpecific.priorityFee,
      },
    })
  },

  // Get Solana transaction fees for deposit
  getSolanaTransactionFees: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  // Check swap status by polling 1Click API
  checkTradeStatus: async ({ config, swap }): Promise<TradeStatus> => {
    console.log('[NEAR Intents] checkTradeStatus called with swap:', swap)
    console.log('[NEAR Intents] swap.metadata:', swap?.metadata)
    console.log('[NEAR Intents] nearIntentsSpecific:', swap?.metadata?.nearIntentsSpecific)

    const { nearIntentsSpecific } = swap?.metadata ?? {}

    if (!nearIntentsSpecific?.depositAddress) {
      console.warn('[NEAR Intents] Missing depositAddress in metadata, returning Unknown status')
      return createDefaultStatusResponse(swap?.buyTxHash)
    }

    // API works without JWT token (just charges 0.1% fee)
    const apiKey = config.VITE_NEAR_INTENTS_API_KEY || ''
    initializeOneClickService(apiKey)

    try {
      // TODO(gomes): SDK doesn't support depositMemo yet in getExecutionStatus
      const statusResponse = await OneClickService.getExecutionStatus(
        nearIntentsSpecific.depositAddress,
      )

      const txStatus = mapNearIntentsStatus(statusResponse.status)
      const message = getNearIntentsStatusMessage(statusResponse.status)

      // Extract buyTxHash from destination chain transactions
      const buyTxHash = statusResponse.swapDetails?.destinationChainTxHashes?.[0]?.hash

      return {
        status: txStatus,
        buyTxHash,
        message,
      }
    } catch (error) {
      return createDefaultStatusResponse(undefined)
    }
  },
}
