import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import { getSolanaTransactionFees, getUnsignedSolanaTransaction } from '../../solana-utils'
import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
import { getUnsignedTronTransaction } from '../../tron-utils/getUnsignedTronTransaction'
import type {
  GetUnsignedNearTransactionArgs,
  GetUnsignedSuiTransactionArgs,
  GetUnsignedTonTransactionArgs,
  SwapperApi,
  TradeStatus,
  UtxoFeeData,
} from '../../types'
import {
  createDefaultStatusResponse,
  getExecutableTradeStep,
  getSwapMetadata,
  isExecutableTradeQuote,
} from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { getNearIntentsStatusMessage, mapNearIntentsStatus } from './utils/helpers'
import { initializeOneClickService, OneClickService } from './utils/oneClickService'

export const nearIntentsApi: SwapperApi = {
  getTradeQuote,
  getTradeRate: (input, deps) => {
    return getTradeRate(input, deps)
  },
  getUnsignedEvmTransaction,
  getEvmTransactionFees,

  getUnsignedUtxoTransaction: ({
    stepIndex,
    tradeQuote,
    assertGetUtxoChainAdapter,
    xpub,
    accountType,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, accountNumber, feeData } = step
    if (!xpub) throw new Error('xpub is required for UTXO transactions')

    const { depositAddress } = getSwapMetadata(step.swapperMetadata, 'nearIntents')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const satoshiPerByte = (feeData.chainSpecific as UtxoFeeData | undefined)?.satsPerByte ?? '0'

    return adapter.buildSendApiTransaction({
      accountNumber,
      to: depositAddress,
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

  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, { skipForNativeSend: true })
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { includeAtaCreationRent: true })
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

    const { accountNumber, sellAsset } = step

    const { depositAddress } = getSwapMetadata(step.swapperMetadata, 'nearIntents')

    const adapter = assertGetSuiChainAdapter(sellAsset.chainId)

    const to = depositAddress
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

  getUnsignedNearTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetNearChainAdapter,
  }: GetUnsignedNearTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset } = step

    const { depositAddress } = getSwapMetadata(step.swapperMetadata, 'nearIntents')

    const adapter = assertGetNearChainAdapter(sellAsset.chainId)

    const to = depositAddress
    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

    return await adapter.buildSendApiTransaction({
      to,
      from,
      value,
      accountNumber,
      chainSpecific: { contractAddress },
    })
  },

  getNearTransactionFees: ({ tradeQuote, stepIndex }: GetUnsignedNearTransactionArgs) => {
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

    const { accountNumber, sellAsset } = step

    const { depositAddress } = getSwapMetadata(step.swapperMetadata, 'nearIntents')

    const adapter = assertGetStarknetChainAdapter(sellAsset.chainId)

    const to = depositAddress
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

  getUnsignedTonTransaction: ({
    stepIndex,
    tradeQuote,
    from,
    assertGetTonChainAdapter,
  }: GetUnsignedTonTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset } = step

    const { depositAddress, depositMemo } = getSwapMetadata(step.swapperMetadata, 'nearIntents')

    const adapter = assertGetTonChainAdapter(sellAsset.chainId)

    const to = depositAddress
    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

    return adapter.buildSendApiTransaction({
      to,
      from,
      value,
      accountNumber,
      chainSpecific: {
        contractAddress,
        memo: depositMemo,
      },
    })
  },

  getTonTransactionFees: ({ tradeQuote, stepIndex }: GetUnsignedTonTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  checkTradeStatus: async ({ config, swap }): Promise<TradeStatus> => {
    const nearIntentsMetadata =
      swap?.metadata.swapperMetadata?.name === 'nearIntents'
        ? swap.metadata.swapperMetadata
        : undefined

    if (!nearIntentsMetadata?.depositAddress) {
      return createDefaultStatusResponse(swap?.buyTxHash)
    }

    initializeOneClickService(config.VITE_NEAR_INTENTS_API_KEY)

    try {
      // TODO(gomes): SDK doesn't support depositMemo yet in getExecutionStatus
      const statusResponse = await OneClickService.getExecutionStatus(
        nearIntentsMetadata.depositAddress,
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
