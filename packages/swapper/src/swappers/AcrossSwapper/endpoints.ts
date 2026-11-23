import { TxStatus } from '@shapeshiftoss/unchained-client'
import axios from 'axios'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus, getSwapMetadata } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { ACROSS_TRANSFER_BASE_URL } from './constant'
import { getAcrossTradeQuote } from './swapperApi/getTradeQuote'
import { getAcrossTradeRate } from './swapperApi/getTradeRate'
import { acrossService } from './utils/acrossService'
import type {
  AcrossApiError,
  AcrossTradeQuoteInput,
  AcrossTradeRateInput,
  AcrossTransfer,
} from './utils/types'

export const acrossApi: SwapperApi = {
  getTradeQuote: (input, deps) => getAcrossTradeQuote(input as AcrossTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getAcrossTradeRate(input as AcrossTradeRateInput, deps),
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
    if (!swap) throw new Error('[Across] swap is required for status check')

    const { orderId } = getSwapMetadata(swap.metadata.swapperMetadata, 'across')
    const swapperTxLink = `${ACROSS_TRANSFER_BASE_URL}/${orderId}`

    const sourceTxStatus = await checkEvmSwapStatus({
      txHash,
      chainId,
      address,
      assertGetEvmChainAdapter,
      fetchIsSmartContractAddressQuery,
    })

    if (sourceTxStatus.status !== TxStatus.Confirmed) {
      return { ...sourceTxStatus, swapperTxId: orderId, swapperTxLink }
    }

    const maybeTransferResponse = await acrossService.get<AcrossTransfer>(
      `${config.VITE_ACROSS_API_URL}/v1/transfers/${orderId}`,
    )

    if (maybeTransferResponse.isErr()) {
      const error = maybeTransferResponse.unwrapErr()

      // Across returns not_found.transfer until it indexes the deposit, usually seconds
      const isNotIndexed =
        axios.isAxiosError<AcrossApiError>(error.cause) &&
        error.cause.response?.data?.code === 'not_found.transfer'

      return {
        buyTxHash: undefined,
        status: isNotIndexed ? TxStatus.Pending : TxStatus.Unknown,
        message: undefined,
        swapperTxId: orderId,
        swapperTxLink,
      }
    }

    const { data: transfer } = maybeTransferResponse.unwrap()

    const status = (() => {
      switch (transfer.status.state) {
        case 'completed':
          return TxStatus.Confirmed
        case 'pending':
          return TxStatus.Pending
        case 'refunded':
        case 'failed':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    const buyTxHash =
      transfer.transactions.find(({ type }) => type === 'fill')?.transaction.txnRef ?? undefined

    return {
      status,
      buyTxHash,
      message: status === TxStatus.Confirmed ? undefined : transfer.status.description,
      swapperTxId: orderId,
      swapperTxLink,
    }
  },
}
