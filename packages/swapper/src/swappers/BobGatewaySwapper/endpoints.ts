import { Configuration, V1Api } from '@gobob/bob-sdk'
import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi, UtxoFeeData } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { BOB_GATEWAY_BASE_URL } from './utils/constants'
import { mapBobGatewayOrderStatusToTxStatus } from './utils/helpers/helpers'

export const bobGatewayApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,

  getUnsignedUtxoTransaction: ({
    stepIndex,
    tradeQuote,
    xpub,
    accountType,
    assertGetUtxoChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote))
      throw new Error('[BobGateway] unable to execute a trade rate')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, bobSpecific, sellAsset } = step

    if (!bobSpecific?.depositAddress)
      throw new Error('[BobGateway] missing depositAddress in step metadata')
    if (!bobSpecific?.orderId) throw new Error('[BobGateway] missing orderId in step metadata')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

    return adapter.buildSendApiTransaction({
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      xpub,
      to: bobSpecific.depositAddress,
      accountNumber,
      skipToAddressValidation: true,
      chainSpecific: {
        accountType,
        satoshiPerByte: (step.feeData.chainSpecific as UtxoFeeData).satsPerByte,
      },
    })
  },

  getUtxoTransactionFees: async ({ stepIndex, tradeQuote, xpub, assertGetUtxoChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote))
      throw new Error('[BobGateway] unable to execute a trade rate')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { bobSpecific, sellAsset } = step

    if (!bobSpecific?.depositAddress)
      throw new Error('[BobGateway] missing depositAddress in step metadata')

    const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)
    const { fast } = await adapter.getFeeData({
      to: bobSpecific.depositAddress,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      chainSpecific: { pubkey: xpub },
      sendMax: false,
    })

    return fast.txFee
  },

  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    assertGetEvmChainAdapter,
    supportsEIP1559,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote))
      throw new Error('[BobGateway] unable to execute a trade rate')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, bobSpecific, sellAsset } = step

    if (!bobSpecific?.evmTx) throw new Error('[BobGateway] missing evmTx in step metadata')
    if (!bobSpecific?.orderId) throw new Error('[BobGateway] missing orderId in step metadata')

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

  checkTradeStatus: async ({ swap }) => {
    const orderId = swap?.metadata.bobSpecific?.orderId
    if (!orderId) throw new Error('[BobGateway] orderId is required for status check')

    const api = new V1Api(new Configuration({ basePath: BOB_GATEWAY_BASE_URL }))

    let orderInfo
    try {
      orderInfo = await api.getOrder({ id: orderId })
    } catch {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: 'Waiting for deposit...',
      }
    }

    const status = mapBobGatewayOrderStatusToTxStatus(orderInfo.status)
    const buyTxHash = orderInfo.dstInfo.txHash ?? undefined

    return {
      buyTxHash,
      status,
      message: undefined,
    }
  },
}
