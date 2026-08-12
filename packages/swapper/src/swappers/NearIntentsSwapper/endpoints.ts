import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type {
  GetUnsignedNearTransactionArgs,
  GetUnsignedSuiTransactionArgs,
  GetUnsignedTonTransactionArgs,
  SwapperApi,
  TradeStatus,
} from '../../types'
import {
  createDefaultStatusResponse,
  getExecutableTradeStep,
  getSwapMetadata,
  isExecutableTradeQuote,
} from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getSolanaTransactionFees, getUnsignedSolanaTransaction } from '../../utils/solana'
import { getTronTransactionFees, getUnsignedTronTransaction } from '../../utils/tron'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { getExactOutputTradeQuote, getTradeQuote } from './swapperApi/getTradeQuote'
import { getExactOutputTradeRate, getTradeRate } from './swapperApi/getTradeRate'
import type {
  NearIntentsExactOutputTradeQuoteInput,
  NearIntentsExactOutputTradeRateInput,
  NearIntentsTradeQuoteInput,
  NearIntentsTradeRateInput,
} from './types'
import { getNearIntentsStatusMessage, mapNearIntentsStatus } from './utils/helpers'
import { initializeOneClickService, OneClickService } from './utils/oneClickService'

export const nearIntentsApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as NearIntentsTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as NearIntentsTradeRateInput, deps),
  getExactOutputTradeQuote: (input, deps) =>
    getExactOutputTradeQuote(input as NearIntentsExactOutputTradeQuoteInput, deps),
  getExactOutputTradeRate: (input, deps) =>
    getExactOutputTradeRate(input as NearIntentsExactOutputTradeRateInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedSolanaTransaction,
  getSolanaTransactionFees,

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
    if (!swap) throw new Error('Missing swap')

    const { depositAddress } = getSwapMetadata(swap.metadata.swapperMetadata, 'nearIntents')

    initializeOneClickService(config.VITE_NEAR_INTENTS_API_KEY)

    try {
      // TODO(gomes): SDK doesn't support depositMemo yet in getExecutionStatus
      const statusResponse = await OneClickService.getExecutionStatus(depositAddress)

      const txStatus = mapNearIntentsStatus(statusResponse.status)
      const message = getNearIntentsStatusMessage(statusResponse.status)

      // Extract buyTxHash from destination chain transactions
      const buyTxHash = statusResponse.swapDetails?.destinationChainTxHashes?.[0]?.hash

      // amountOut is only meaningful destination-denominated on terminal success - in-flight and
      // refund states may carry settlement-internal or refund values
      const actualBuyAmountCryptoBaseUnit =
        statusResponse.status === 'SUCCESS' ? statusResponse.swapDetails?.amountOut : undefined

      return {
        status: txStatus,
        buyTxHash,
        swapperTxLink: `https://explorer.near-intents.org/transactions/${depositAddress}`,
        message,
        actualBuyAmountCryptoBaseUnit,
      }
    } catch (error) {
      return createDefaultStatusResponse(undefined)
    }
  },
}
