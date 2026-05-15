import { evm, toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import { hash, num, validateAndParseAddress } from 'starknet'

import type { SwapperApi, TradeStatus, UtxoFeeData } from '../../types'
import {
  checkStarknetSwapStatus,
  createDefaultStatusResponse,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { fetchGardenOrder } from './utils/fetchFromGarden'
import { mapGardenOrderToTxStatus } from './utils/helpers/helpers'

const toHexString = (value: unknown): string => {
  const strValue = String(value)
  if (strValue.startsWith('0x')) return strValue
  if (/^[0-9a-fA-F]+$/.test(strValue) && /[a-fA-F]/.test(strValue)) {
    return `0x${strValue}`
  }
  try {
    return num.toHex(strValue)
  } catch {
    return `0x${strValue}`
  }
}

export const gardenApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,

  getUnsignedUtxoTransaction: ({
    stepIndex,
    tradeQuote,
    assertGetUtxoChainAdapter,
    xpub,
    accountType,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, accountNumber, gardenSpecific, feeData } = step
    if (!gardenSpecific?.bitcoinDepositAddress) {
      throw new Error('gardenSpecific.bitcoinDepositAddress is required for UTXO source')
    }
    if (!xpub) throw new Error('xpub is required for UTXO transactions')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    const satoshiPerByte = (feeData.chainSpecific as UtxoFeeData | undefined)?.satsPerByte ?? '0'

    return adapter.buildSendApiTransaction({
      accountNumber,
      to: gardenSpecific.bitcoinDepositAddress,
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

  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, sellAsset, gardenSpecific } = step
    if (!gardenSpecific?.evmInitiate) {
      throw new Error('gardenSpecific.evmInitiate is required for EVM source')
    }

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId as EvmChainId)
    const { to, data, value } = gardenSpecific.evmInitiate

    const feeData = await evm.getFees({
      adapter,
      data,
      to,
      value,
      from,
      supportsEIP1559,
    })

    return adapter.buildSendApiTransaction({
      accountNumber,
      from,
      to,
      value,
      chainSpecific: { contractAddress: undefined, data, ...feeData },
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
    const { sellAsset, gardenSpecific } = step
    if (!gardenSpecific?.evmInitiate) {
      throw new Error('gardenSpecific.evmInitiate is required for EVM source')
    }

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId as EvmChainId)
    const { to, data, value } = gardenSpecific.evmInitiate

    const feeData = await evm.getFees({
      adapter,
      data,
      to,
      value,
      from,
      supportsEIP1559,
    })

    return feeData.networkFeeCryptoBaseUnit
  },

  getUnsignedStarknetTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetStarknetChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, gardenSpecific } = step
    if (!gardenSpecific?.starknetCalls || gardenSpecific.starknetCalls.length === 0) {
      throw new Error('gardenSpecific.starknetCalls is required for Starknet source')
    }

    const adapter = assertGetStarknetChainAdapter(sellAsset.chainId)
    const normalizedFrom = validateAndParseAddress(from)

    const fullCalldata: string[] = [gardenSpecific.starknetCalls.length.toString()]
    for (const call of gardenSpecific.starknetCalls) {
      const normalizedContractAddress = validateAndParseAddress(call.to)
      fullCalldata.push(
        normalizedContractAddress,
        call.selector,
        call.calldata.length.toString(),
        ...call.calldata.map(String),
      )
    }

    const formattedCalldata = fullCalldata.map(toHexString)

    const chainIdHex = await adapter.getStarknetProvider().getChainId()
    const nonce = await adapter.getNonce(normalizedFrom)

    const version = '0x3' as const
    const estimateTx = {
      type: 'INVOKE',
      version,
      sender_address: normalizedFrom,
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
    if (!feeEstimate) throw new Error('Fee estimation failed: no estimate returned')

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

    const invokeHashInputs = {
      senderAddress: normalizedFrom,
      version,
      compiledCalldata: formattedCalldata,
      chainId: chainIdHex,
      nonce,
      nonceDataAvailabilityMode: 0 as const,
      feeDataAvailabilityMode: 0 as const,
      resourceBounds: {
        l1_gas: resourceBounds.l1_gas,
        l2_gas: resourceBounds.l2_gas,
        l1_data_gas: resourceBounds.l1_data_gas,
      },
      tip: '0x0',
      paymasterData: [],
      accountDeploymentData: [],
    }

    const txHash = hash.calculateInvokeTransactionHash(invokeHashInputs)

    return {
      addressNList: toAddressNList(adapter.getBip44Params({ accountNumber })),
      txHash,
      _txDetails: {
        fromAddress: normalizedFrom,
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

  checkTradeStatus: async ({
    config,
    swap,
    assertGetStarknetChainAdapter,
  }): Promise<TradeStatus> => {
    const orderId = swap?.metadata.gardenSpecific?.orderId

    if (!orderId) {
      if (swap?.sellTxHash && swap.sellAsset?.chainId?.startsWith('starknet:')) {
        return checkStarknetSwapStatus({
          txHash: swap.sellTxHash,
          assertGetStarknetChainAdapter,
        })
      }
      return createDefaultStatusResponse(swap?.buyTxHash)
    }

    const orderResult = await fetchGardenOrder({
      apiKey: config.VITE_GARDEN_API_KEY,
      orderId,
    })

    if (orderResult.isErr()) {
      return createDefaultStatusResponse(swap?.buyTxHash)
    }

    const order = orderResult.unwrap()
    const { status, buyTxHash, message } = mapGardenOrderToTxStatus(order)

    return {
      status,
      buyTxHash: buyTxHash ?? swap?.buyTxHash,
      message,
    }
  },
}
