import { quoteToCalls } from '@avnu/avnu-sdk'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { CallData, hash, num } from 'starknet'

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

    // Convert slippage from decimal percentage string to number for AVNU format (e.g., "0.01" = 1%)
    const slippage: number = slippageTolerancePercentageDecimal
      ? parseFloat(slippageTolerancePercentageDecimal)
      : 0.01

    // Get the swap calls from AVNU SDK
    const { calls: avnuCalls } = await quoteToCalls({
      quoteId: avnuSpecific.quoteId,
      slippage,
      takerAddress: from,
    })

    // Build the full invoke transaction calldata from AVNU calls
    // Format: [call_array_length, contract1, selector1, calldata_len1, ...calldata1, ...]
    const fullCalldata: string[] = [avnuCalls.length.toString()]

    for (const call of avnuCalls) {
      const rawCalldata = call.calldata ?? []
      const calldataArray = Array.isArray(rawCalldata) ? rawCalldata : CallData.compile(rawCalldata)
      const selector = hash.getSelectorFromName(call.entrypoint)

      fullCalldata.push(
        call.contractAddress,
        selector,
        calldataArray.length.toString(),
        ...calldataArray.map(cd => cd.toString()),
      )
    }

    // Format calldata for RPC (convert numbers to hex)
    const formattedCalldata = fullCalldata.map(data => {
      if (!data.startsWith('0x')) {
        return num.toHex(data)
      }
      return data
    })

    // Get nonce using adapter method (checks deployment status and returns appropriate nonce)
    const chainIdHex = await adapter.getStarknetProvider().getChainId()
    const nonce = await adapter.getNonce(from)

    // Estimate fees for the multi-call swap transaction
    const version = '0x3' as const
    const estimateTx = {
      type: 'INVOKE',
      version,
      sender_address: from,
      calldata: formattedCalldata,
      signature: [],
      nonce,
      resource_bounds: {
        l1_gas: { max_amount: '0x186a0', max_price_per_unit: '0x5f5e100' },
        l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
        l1_data_gas: { max_amount: '0x186a0', max_price_per_unit: '0x1' },
      },
      tip: '0x0',
      paymaster_data: [],
      account_deployment_data: [],
      nonce_data_availability_mode: 'L1',
      fee_data_availability_mode: 'L1',
    }

    const estimateResponse = await adapter
      .getStarknetProvider()
      .fetch('starknet_estimateFee', [[estimateTx], ['SKIP_VALIDATE'], 'latest'])
    const estimateResult: {
      result?: {
        l1_gas_consumed?: string
        l1_gas_price?: string
        l2_gas_consumed?: string
        l2_gas_price?: string
        l1_data_gas_consumed?: string
        l1_data_gas_price?: string
      }[]
      error?: unknown
    } = await estimateResponse.json()

    if (estimateResult.error) {
      throw new Error(`Fee estimation failed: ${JSON.stringify(estimateResult.error)}`)
    }

    const feeEstimate = estimateResult.result?.[0]
    if (!feeEstimate) {
      throw new Error('Fee estimation failed: no estimate returned')
    }

    // Calculate resource bounds with buffer (5x gas amount, 2x gas price)
    const l1GasConsumed = feeEstimate.l1_gas_consumed
      ? BigInt(feeEstimate.l1_gas_consumed)
      : BigInt('0x186a0')
    const l1GasPrice = feeEstimate.l1_gas_price
      ? BigInt(feeEstimate.l1_gas_price)
      : BigInt('0x5f5e100')
    const l2GasConsumed = feeEstimate.l2_gas_consumed
      ? BigInt(feeEstimate.l2_gas_consumed)
      : BigInt('0x0')
    const l2GasPrice = feeEstimate.l2_gas_price ? BigInt(feeEstimate.l2_gas_price) : BigInt('0x0')
    const l1DataGasConsumed = feeEstimate.l1_data_gas_consumed
      ? BigInt(feeEstimate.l1_data_gas_consumed)
      : BigInt('0x186a0')
    const l1DataGasPrice = feeEstimate.l1_data_gas_price
      ? BigInt(feeEstimate.l1_data_gas_price)
      : BigInt('0x1')

    const resourceBounds = {
      l1_gas: {
        max_amount: (l1GasConsumed * BigInt(500)) / BigInt(100),
        max_price_per_unit: (l1GasPrice * BigInt(200)) / BigInt(100),
      },
      l2_gas: {
        max_amount: (l2GasConsumed * BigInt(500)) / BigInt(100),
        max_price_per_unit: (l2GasPrice * BigInt(200)) / BigInt(100),
      },
      l1_data_gas: {
        max_amount: (l1DataGasConsumed * BigInt(500)) / BigInt(100),
        max_price_per_unit: (l1DataGasPrice * BigInt(200)) / BigInt(100),
      },
    }

    // Calculate transaction hash for signing
    const invokeHashInputs = {
      senderAddress: from,
      version,
      compiledCalldata: formattedCalldata,
      chainId: chainIdHex,
      nonce,
      nonceDataAvailabilityMode: 0 as const, // L1
      feeDataAvailabilityMode: 0 as const, // L1
      resourceBounds: {
        l1_gas: {
          max_amount: resourceBounds.l1_gas.max_amount,
          max_price_per_unit: resourceBounds.l1_gas.max_price_per_unit,
        },
        l2_gas: {
          max_amount: resourceBounds.l2_gas.max_amount,
          max_price_per_unit: resourceBounds.l2_gas.max_price_per_unit,
        },
        l1_data_gas: {
          max_amount: resourceBounds.l1_data_gas.max_amount,
          max_price_per_unit: resourceBounds.l1_data_gas.max_price_per_unit,
        },
      },
      tip: '0x0',
      paymasterData: [],
      accountDeploymentData: [],
    }

    const txHash = hash.calculateInvokeTransactionHash(invokeHashInputs)

    // Return transaction ready for signing
    return {
      addressNList: toAddressNList(adapter.getBip44Params({ accountNumber })),
      txHash,
      _txDetails: {
        fromAddress: from,
        calldata: formattedCalldata,
        nonce,
        version,
        resourceBounds,
        chainId: chainIdHex,
        nonceDataAvailabilityMode: 0 as const,
        feeDataAvailabilityMode: 0 as const,
        tip: '0x0',
        paymasterData: [],
        accountDeploymentData: [],
      },
    }
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
