import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import {
  checkSafeTransactionStatus,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { assertGetCowNetwork } from '../../utils/cowswap'
import { CowStatusMessage } from './constants'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote/getCowSwapTradeQuote'
import { getCowSwapTradeRate } from './getCowSwapTradeRate/getCowSwapTradeRate'
import type {
  CowSwapGetTradesResponse,
  CowSwapOrdersResponse,
  CowSwapTradeQuoteInput,
  CowSwapTradeRateInput,
} from './types'
import { cowService } from './utils/cowService'

export const cowApi: SwapperApi = {
  getTradeQuote: (input, deps) => getCowSwapTradeQuote(input as CowSwapTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getCowSwapTradeRate(input as CowSwapTradeRateInput, deps),
  getUnsignedEvmMessage: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const { transactionData } = getExecutableTradeStep(tradeQuote, stepIndex)
    if (transactionData?.type !== 'cowswap') throw new Error('CowSwap order data is required')

    const { chainId, orderToSign } = transactionData

    return Promise.resolve({ chainId, orderToSign })
  },
  getEvmTransactionFees: () => {
    // No transaction fees for CoW
    return Promise.resolve('0')
  },
  checkTradeStatus: async ({
    txHash, // TODO: this is not a tx hash, its an ID
    chainId,
    address,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
    config,
  }) => {
    const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      fetchIsSmartContractAddressQuery,
      address,
    })

    if (maybeSafeTransactionStatus) return maybeSafeTransactionStatus

    const network = assertGetCowNetwork(chainId)

    // with cow we aren't able to get the tx hash until it's already completed, so we must use the
    // order uid to fetch the trades and use their existence as indicating "complete"
    // https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/6.-checking-order-status
    const tradesResponse = await cowService.get<CowSwapGetTradesResponse>(
      `${config.VITE_COWSWAP_BASE_URL}/${network}/api/v1/trades`,
      { params: { orderUid: txHash } },
    )

    if (tradesResponse.isErr()) throw tradesResponse.unwrapErr()
    const { data: trades } = tradesResponse.unwrap()

    if (trades.length) {
      const buyTxHash = trades[0]?.txHash

      if (buyTxHash) {
        return {
          status: TxStatus.Confirmed,
          buyTxHash,
          message: CowStatusMessage.Fulfilled,
        }
      }
    } else {
      const ordersResponse = await cowService.get<CowSwapOrdersResponse>(
        `${config.VITE_COWSWAP_BASE_URL}/${network}/api/v1/orders/${txHash}`,
      )

      if (ordersResponse.isErr()) throw ordersResponse.unwrapErr()
      const { data: order } = ordersResponse.unwrap()

      switch (order.status) {
        case 'cancelled':
          return {
            status: TxStatus.Failed,
            buyTxHash: undefined,
            message: CowStatusMessage.Cancelled,
          }
        case 'expired':
          return {
            status: TxStatus.Failed,
            buyTxHash: undefined,
            message: CowStatusMessage.Expired,
          }
        default:
      }
    }

    return {
      status: TxStatus.Pending,
      buyTxHash: undefined,
      message: CowStatusMessage.Open,
    }
  },
}
