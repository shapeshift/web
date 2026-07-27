import { isGatewayError } from '@gobob/bob-sdk'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import { getExecutableTradeStep, getSwapMetadata, isExecutableTradeQuote } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTronTransactionFees } from '../../utils/tron'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { getBobGatewayTradeQuote } from './swapperApi/getTradeQuote'
import { getBobGatewayTradeRate } from './swapperApi/getTradeRate'
import type { BobGatewayTradeQuoteInput, BobGatewayTradeRateInput } from './types'
import {
  getBobGatewayClient,
  mapBobGatewayOrderStatusToTxStatus,
  registerBobGatewayTx,
  toTronBase58,
} from './utils/helpers'

const registeredSwapIds = new Set<string>()

export const bobGatewayApi: SwapperApi = {
  getTradeRate: (input, deps) => getBobGatewayTradeRate(input as BobGatewayTradeRateInput, deps),
  getTradeQuote: (input, deps) => getBobGatewayTradeQuote(input as BobGatewayTradeQuoteInput, deps),
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedTronTransaction: ({ from, stepIndex, tradeQuote, assertGetTronChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('[BobGateway] unable to execute a trade rate')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, transactionData } = step
    if (transactionData?.type !== 'tron') throw new Error('[BobGateway] invalid tron transaction')

    const adapter = assertGetTronChainAdapter(sellAsset.chainId)

    const { to, data, value } = transactionData

    return adapter.buildCustomApiTx({
      accountNumber,
      from,
      to: toTronBase58(to),
      value,
      data,
    })
  },
  getTronTransactionFees,
  checkTradeStatus: async ({ swap, config, txHash }) => {
    if (!swap) throw new Error('[BobGateway] swap is required for status check')

    const { orderId } = getSwapMetadata(swap.metadata.swapperMetadata, 'bob')

    if (txHash && !registeredSwapIds.has(swap.id)) {
      try {
        await registerBobGatewayTx({
          config,
          orderId,
          txHash,
          sellAsset: swap.sellAsset,
          buyAsset: swap.buyAsset,
        })
        registeredSwapIds.add(swap.id)
      } catch {}
    }

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
