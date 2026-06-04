import { isGatewayError } from '@gobob/bob-sdk'
import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi, UtxoFeeData } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { getBobGatewayClient, mapBobGatewayOrderStatusToTxStatus } from './utils/helpers'

export const bobGatewayApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  getUnsignedUtxoTransaction: async ({
    stepIndex,
    tradeQuote,
    xpub,
    accountType,
    config,
    assertGetUtxoChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote))
      throw new Error('[BobGateway] unable to execute a trade rate')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, bobSpecific, sellAsset } = step

    if (!bobSpecific?.gatewayQuote) throw new Error('[BobGateway] missing quote in step metadata')

    if (!bobSpecific.depositAddress) {
      const orderResponse = await getBobGatewayClient(config).api.createOrderV2({
        gatewayQuoteV2: bobSpecific.gatewayQuote,
      })
      if (!('onramp' in orderResponse)) {
        throw new Error('[BobGateway] unexpected order response type')
      }
      bobSpecific.orderId = orderResponse.onramp.orderId
      bobSpecific.depositAddress = orderResponse.onramp.address
      bobSpecific.opReturnData = orderResponse.onramp.opReturnData ?? undefined
    }

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)
    const satoshiPerByte = (step.feeData.chainSpecific as UtxoFeeData | undefined)?.satsPerByte

    if (!satoshiPerByte) {
      const { fast } = await adapter.getFeeData({
        to: bobSpecific.depositAddress,
        value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: { pubkey: xpub, opReturnData: bobSpecific.opReturnData ?? undefined },
        sendMax: false,
      })

      step.feeData.networkFeeCryptoBaseUnit = fast.txFee
      step.feeData.chainSpecific = { satsPerByte: fast.chainSpecific.satoshiPerByte }
    }

    return adapter.buildSendApiTransaction({
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub,
      to: bobSpecific.depositAddress,
      accountNumber,
      skipToAddressValidation: true,
      chainSpecific: {
        accountType,
        opReturnData: bobSpecific.opReturnData ?? undefined,
        satoshiPerByte: (step.feeData.chainSpecific as UtxoFeeData).satsPerByte,
      },
    })
  },
  getUtxoTransactionFees: async ({ stepIndex, tradeQuote, xpub, assertGetUtxoChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote))
      throw new Error('[BobGateway] unable to execute a trade rate')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { bobSpecific, sellAsset } = step

    if (!bobSpecific?.depositAddress) {
      if (!step.feeData.networkFeeCryptoBaseUnit) {
        throw new Error('[BobGateway] missing network fee in quote')
      }

      return step.feeData.networkFeeCryptoBaseUnit
    }

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)
    const { fast } = await adapter.getFeeData({
      to: bobSpecific.depositAddress,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: { pubkey: xpub, opReturnData: bobSpecific.opReturnData ?? undefined },
      sendMax: false,
    })

    step.feeData.networkFeeCryptoBaseUnit = fast.txFee
    step.feeData.chainSpecific = { satsPerByte: fast.chainSpecific.satoshiPerByte }

    return fast.txFee
  },
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    assertGetEvmChainAdapter,
    config,
    supportsEIP1559,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote))
      throw new Error('[BobGateway] unable to execute a trade rate')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, bobSpecific, sellAsset } = step

    if (!bobSpecific?.gatewayQuote) throw new Error('[BobGateway] missing quote in step metadata')

    if (!bobSpecific.evmTx) {
      const orderResponse = await getBobGatewayClient(config).api.createOrderV2({
        gatewayQuoteV2: bobSpecific.gatewayQuote,
      })
      if (!('offramp' in orderResponse) && !('tokenSwap' in orderResponse)) {
        throw new Error('[BobGateway] unexpected order response type')
      }
      // offramp (EVM→BTC) and tokenSwap (EVM→EVM) orders share the same shape
      const order = 'offramp' in orderResponse ? orderResponse.offramp : orderResponse.tokenSwap
      bobSpecific.orderId = order.orderId
      bobSpecific.evmTx = {
        to: order.tx.to,
        data: order.tx.data,
        value: order.tx.value,
        chain: order.tx.chain,
      }
    }

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)
    const { to, data, value } = bobSpecific.evmTx

    const feeData = await evm.getFees({
      adapter,
      data: data || '0x',
      to,
      value,
      from,
      supportsEIP1559,
    })

    return adapter.buildCustomApiTx({
      accountNumber,
      from,
      to,
      value,
      data: data || '0x',
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
    if (!isExecutableTradeQuote(tradeQuote))
      throw new Error('[BobGateway] unable to execute a trade rate')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { bobSpecific, sellAsset } = step

    if (!bobSpecific?.evmTx) throw new Error('[BobGateway] missing evmTx in step metadata')

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)
    const { to, data, value } = bobSpecific.evmTx

    const { networkFeeCryptoBaseUnit } = await evm.getFees({
      adapter,
      data: data || '0x',
      to,
      value,
      from,
      supportsEIP1559,
    })

    return networkFeeCryptoBaseUnit
  },
  checkTradeStatus: async ({ swap, config }) => {
    const orderId = swap?.metadata.bobSpecific?.orderId
    if (!orderId) throw new Error('[BobGateway] orderId is required for status check')

    let orderInfo
    try {
      orderInfo = await getBobGatewayClient(config).getOrder(orderId)
    } catch (err) {
      if (isGatewayError(err)) {
        if (err.code === 'ORDER_NOT_FOUND') {
          return {
            buyTxHash: undefined,
            status: TxStatus.Unknown,
            message: 'Waiting for deposit...',
          }
        }
      }

      throw err
    }

    const status = mapBobGatewayOrderStatusToTxStatus(orderInfo.status)
    const buyTxHash =
      'success' in orderInfo.status ? orderInfo.status.success.receivedTokens[0]?.txHash : undefined

    const refundTxHash =
      'refunded' in orderInfo.status
        ? orderInfo.status.refunded.refundedTokens[0]?.txHash
        : undefined

    return {
      buyTxHash: status === TxStatus.Confirmed ? buyTxHash : refundTxHash,
      status,
      message: undefined,
    }
  },
}
