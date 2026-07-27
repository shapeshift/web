import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus, getSwapMetadata } from '../../utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { debridgeService } from './utils/debridgeService'
import type {
  DebridgeOrderDetail,
  DebridgeOrderIdsResponse,
  DebridgeOrderStatus,
  DebridgeTradeQuoteInput,
  DebridgeTradeRateInput,
} from './utils/types'

const DEBRIDGE_STATS_API_URL = 'https://stats-api.dln.trade'

export const debridgeApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as DebridgeTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as DebridgeTradeRateInput, deps),
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  checkTradeStatus: async ({
    txHash,
    chainId,
    address,
    swap,
    config,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    if (!swap) throw new Error('[deBridge] swap is required for status check')

    const { isSameChainSwap } = getSwapMetadata(swap.metadata.swapperMetadata, 'debridge')

    if (isSameChainSwap) {
      return checkEvmSwapStatus({
        txHash,
        chainId,
        address,
        assertGetEvmChainAdapter,
        fetchIsSmartContractAddressQuery,
      })
    }

    const sourceTxStatus = await checkEvmSwapStatus({
      txHash,
      chainId,
      address,
      assertGetEvmChainAdapter,
      fetchIsSmartContractAddressQuery,
    })

    if (sourceTxStatus.status !== TxStatus.Confirmed) return sourceTxStatus

    const resolvedTxHash = sourceTxStatus.buyTxHash ?? txHash

    const maybeOrderIdsResponse = await debridgeService.get<DebridgeOrderIdsResponse>(
      `${DEBRIDGE_STATS_API_URL}/api/Transaction/${resolvedTxHash}/orderIds`,
    )

    if (maybeOrderIdsResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Pending,
        message: 'Waiting for order confirmation...',
      }
    }

    const { data: orderIdsResponse } = maybeOrderIdsResponse.unwrap()

    if (!orderIdsResponse.orderIds?.length) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Pending,
        message: 'Waiting for order confirmation...',
      }
    }

    const orderId = orderIdsResponse.orderIds[0].stringValue

    const maybeStatusResponse = await debridgeService.get<DebridgeOrderStatus>(
      `${config.VITE_DEBRIDGE_API_URL}/dln/order/${orderId}/status`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()

    const status = (() => {
      switch (statusResponse.status) {
        case 'Fulfilled':
        case 'SentUnlock':
        case 'ClaimedUnlock':
          return TxStatus.Confirmed
        case 'Created':
        case 'None':
          return TxStatus.Pending
        case 'OrderCancelled':
        case 'SentOrderCancel':
        case 'ClaimedOrderCancel':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    const message = (() => {
      switch (statusResponse.status) {
        case 'Created':
        case 'None':
          return 'Order created, waiting for solver fulfillment...'
        case 'Fulfilled':
          return 'Order fulfilled, unlocking funds...'
        case 'SentUnlock':
          return 'Unlock transaction sent...'
        case 'OrderCancelled':
          return 'Order was cancelled'
        case 'SentOrderCancel':
          return 'Cancellation in progress...'
        case 'ClaimedOrderCancel':
          return 'Order cancelled and refunded'
        default:
          return undefined
      }
    })()

    const buyTxHash = await (async () => {
      if (status !== TxStatus.Confirmed) return undefined
      const maybeOrderDetail = await debridgeService.get<DebridgeOrderDetail>(
        `${DEBRIDGE_STATS_API_URL}/api/Orders/${orderId}`,
      )
      if (maybeOrderDetail.isErr()) return undefined
      return maybeOrderDetail.unwrap().data.fulfilledDstEventMetadata?.transactionHash?.stringValue
    })()

    return {
      status,
      buyTxHash,
      message,
    }
  },
}
