import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
import { getUnsignedTronTransaction } from '../../tron-utils/getUnsignedTronTransaction'
import type {
  GetUnsignedSuiTransactionArgs,
  SwapperApi,
  TradeStatus,
  UtxoFeeData,
} from '../../types'
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

  getUnsignedUtxoTransaction: ({
    stepIndex,
    tradeQuote,
    assertGetUtxoChainAdapter,
    xpub,
    accountType,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, accountNumber, nearIntentsSpecific, feeData } = step
    if (!nearIntentsSpecific) throw new Error('nearIntentsSpecific is required')
    if (!xpub) throw new Error('xpub is required for UTXO transactions')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const satoshiPerByte = (feeData.chainSpecific as UtxoFeeData | undefined)?.satsPerByte ?? '0'

    return adapter.buildSendApiTransaction({
      accountNumber,
      to: nearIntentsSpecific.depositAddress,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sendMax: false,
      chainSpecific: {
        satoshiPerByte,
        accountType,
      },
      xpub,
    })
  },

  getUtxoTransactionFees: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

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
      chainSpecific: tokenId
        ? {
            // For SPL tokens: include compute budget parameters
            tokenId,
            computeUnitLimit: fast.chainSpecific.computeUnits,
            computeUnitPrice: fast.chainSpecific.priorityFee,
          }
        : {
            // For native SOL: no compute budget needed for simple transfers
            tokenId,
          },
    })
  },

  getSolanaTransactionFees: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  getUnsignedTronTransaction,
  getTronTransactionFees,
  getUnsignedSuiTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetSuiChainAdapter,
  }: GetUnsignedSuiTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, nearIntentsSpecific } = step
    if (!nearIntentsSpecific) throw new Error('nearIntentsSpecific is required')

    const adapter = assertGetSuiChainAdapter(sellAsset.chainId)

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
        gasBudget: fast.chainSpecific.gasBudget,
        gasPrice: fast.chainSpecific.gasPrice,
      },
    })
  },

  getSuiTransactionFees: ({ tradeQuote, stepIndex }: GetUnsignedSuiTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  getUnsignedStarknetTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetStarknetChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, nearIntentsSpecific } = step
    if (!nearIntentsSpecific) throw new Error('nearIntentsSpecific is required')

    const adapter = assertGetStarknetChainAdapter(sellAsset.chainId)

    const to = nearIntentsSpecific.depositAddress
    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const tokenContractAddress = contractAddressOrUndefined(sellAsset.assetId)

    const { fast } = await adapter.getFeeData({
      to,
      value,
      chainSpecific: {
        from,
        tokenContractAddress,
      },
      sendMax: false,
    })

    return adapter.buildSendApiTransaction({
      from,
      to,
      value,
      accountNumber,
      chainSpecific: {
        tokenContractAddress,
        maxFee: fast.chainSpecific.maxFee,
      },
    })
  },

  getStarknetTransactionFees: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  checkTradeStatus: async ({ config, swap }): Promise<TradeStatus> => {
    const { nearIntentsSpecific } = swap?.metadata ?? {}

    if (!nearIntentsSpecific?.depositAddress) {
      return createDefaultStatusResponse(swap?.buyTxHash)
    }

    initializeOneClickService(config.VITE_NEAR_INTENTS_API_KEY)

    try {
      // TODO(gomes): SDK doesn't support depositMemo yet in getExecutionStatus
      const statusResponse = await OneClickService.getExecutionStatus(
        nearIntentsSpecific.depositAddress,
      )

      const txStatus = mapNearIntentsStatus(statusResponse.status)
      const message = getNearIntentsStatusMessage(statusResponse.status)

      // Extract buyTxHash from destination chain transactions
      const buyTxHash = statusResponse.swapDetails?.destinationChainTxHashes?.[0]?.hash
      const actualBuyAmountCryptoBaseUnit = statusResponse.swapDetails?.amountOut

      return {
        status: txStatus,
        buyTxHash,
        message,
        actualBuyAmountCryptoBaseUnit,
      }
    } catch (error) {
      return createDefaultStatusResponse(undefined)
    }
  },
}
