import { isGatewayError } from '@gobob/bob-sdk'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import { getExecutableTradeStep, getSwapMetadata, isExecutableTradeQuote } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTronTransactionFees, getUnsignedTronTransaction } from '../../utils/tron'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { getBobGatewayTradeQuote } from './swapperApi/getTradeQuote'
import { getBobGatewayTradeRate } from './swapperApi/getTradeRate'
import type { BobGatewayTradeQuoteInput, BobGatewayTradeRateInput } from './types'
import { getBobGatewayClient, mapBobGatewayOrderStatusToTxStatus } from './utils/helpers'

export const bobGatewayApi: SwapperApi = {
  getTradeRate: (input, deps) => getBobGatewayTradeRate(input as BobGatewayTradeRateInput, deps),
  getTradeQuote: (input, deps) => getBobGatewayTradeQuote(input as BobGatewayTradeQuoteInput, deps),
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedTronTransaction,
  getTronTransactionFees,
  checkTradeStatus: async ({ swap, config }) => {
    if (!swap) throw new Error('[BobGateway] swap is required for status check')

    const { orderId } = getSwapMetadata(swap.metadata.swapperMetadata, 'bob')

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
      status,
      buyTxHash,
      message: refundTxHash ? 'Trade refunded' : undefined,
    }
  },
}
