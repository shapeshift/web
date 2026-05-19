import { quoteToCalls } from '@avnu/avnu-sdk'
import { CallData, hash, validateAndParseAddress } from 'starknet'

import { buildStarknetInvokeTx, toHexString } from '../../starknet-utils'
import type { SwapperApi, TradeStatus } from '../../types'
import {
  checkStarknetSwapStatus,
  createDefaultStatusResponse,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

export const avnuApi: SwapperApi = {
  getTradeQuote,
  getTradeRate: (input, deps) => {
    return getTradeRate(input, deps)
  },

  getUnsignedStarknetTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    slippageTolerancePercentageDecimal,
    assertGetStarknetChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, avnuSpecific } = step
    if (!avnuSpecific) throw new Error('avnuSpecific is required')
    if (!avnuSpecific.quoteId) throw new Error('quoteId is required in avnuSpecific')

    const adapter = assertGetStarknetChainAdapter(sellAsset.chainId)

    // Normalize the from address to ensure consistent format
    // Starknet addresses can have different representations (with/without leading zeros)
    const normalizedFrom = validateAndParseAddress(from)

    // Convert slippage from decimal percentage string to number for AVNU format (e.g., "0.01" = 1%)
    // Use a slightly higher default slippage (2%) to account for quote staleness
    const slippage: number = slippageTolerancePercentageDecimal
      ? parseFloat(slippageTolerancePercentageDecimal)
      : 0.02

    // Get the swap calls from AVNU SDK
    const { calls: avnuCalls } = await quoteToCalls({
      quoteId: avnuSpecific.quoteId,
      slippage,
      takerAddress: normalizedFrom,
    })

    if (!avnuCalls || avnuCalls.length === 0) {
      throw new Error('No swap calls returned from AVNU - quote may have expired')
    }

    // Build the full invoke transaction calldata from AVNU calls
    // Format: [call_array_length, contract1, selector1, calldata_len1, ...calldata1, ...]
    const fullCalldata: string[] = [avnuCalls.length.toString()]

    for (const call of avnuCalls) {
      const rawCalldata = call.calldata ?? []
      const calldataArray = Array.isArray(rawCalldata) ? rawCalldata : CallData.compile(rawCalldata)
      const selector = hash.getSelectorFromName(call.entrypoint)
      // Normalize contract address from AVNU to ensure consistent format
      const normalizedContractAddress = validateAndParseAddress(call.contractAddress)

      fullCalldata.push(
        normalizedContractAddress,
        selector,
        calldataArray.length.toString(),
        ...calldataArray.map(cd => String(cd)),
      )
    }

    const formattedCalldata = fullCalldata.map(toHexString)

    return buildStarknetInvokeTx({
      formattedCalldata,
      normalizedFrom,
      accountNumber,
      adapter,
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

  checkTradeStatus: ({ swap, assertGetStarknetChainAdapter }): Promise<TradeStatus> => {
    if (!swap?.sellTxHash) {
      return Promise.resolve(createDefaultStatusResponse())
    }

    return checkStarknetSwapStatus({
      txHash: swap.sellTxHash,
      assertGetStarknetChainAdapter,
    })
  },
}
