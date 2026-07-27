import { getTronTransactionFees, getUnsignedTronTransaction } from '../../utils/tron'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import type { SolanaComputeBudgetOptions } from '../../utils/solana'
import { getSolanaTransactionFees, getUnsignedSolanaTransaction } from '../../utils/solana'
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
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { getNearIntentsStatusMessage, mapNearIntentsStatus } from './utils/helpers'
import { initializeOneClickService, OneClickService } from './utils/oneClickService'

// Deposits are plain (token) transfers with constant measured compute consumption (max 15394 CU
// with ata creation), so the margin is safety only; the floor guarantees the limit covers full
// ata recreation if the deposit ata is closed between simulation and landing (a no-op create
// simulates ~3x cheaper than a real one)
const solanaComputeBudget: SolanaComputeBudgetOptions = {
  marginMultiplier: 1.1,
  minComputeUnits: 20_000,
}

export const nearIntentsApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, { computeBudget: solanaComputeBudget })
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
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
