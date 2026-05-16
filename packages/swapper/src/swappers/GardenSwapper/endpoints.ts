import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import { validateAndParseAddress } from 'starknet'

import { buildStarknetInvokeTx, toHexString } from '../../starknet-utils'
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

  getUnsignedStarknetTransaction: ({
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

  checkTradeStatus: async ({
    config,
    swap,
    assertGetStarknetChainAdapter,
  }): Promise<TradeStatus> => {
    const orderId = swap?.metadata.gardenSpecific?.orderId

    if (!orderId) {
      const isStarknetSource =
        swap?.sellAsset?.assetId !== undefined &&
        fromAssetId(swap.sellAsset.assetId).chainNamespace === CHAIN_NAMESPACE.Starknet
      if (swap?.sellTxHash && isStarknetSource) {
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
    const { status, buyTxHash, message, actualBuyAmountCryptoBaseUnit } =
      mapGardenOrderToTxStatus(order)

    return {
      status,
      buyTxHash: buyTxHash ?? swap?.buyTxHash,
      message,
      actualBuyAmountCryptoBaseUnit,
    }
  },
}
