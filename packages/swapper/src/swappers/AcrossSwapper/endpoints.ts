import { TxStatus } from '@shapeshiftoss/unchained-client'
import axios from 'axios'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus, getSwapMetadata } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { acrossService } from './utils/acrossService'
import type { AcrossTradeQuoteInput, AcrossTradeRateInput, AcrossTransfer } from './utils/types'
import { getAcrossApiError } from './utils/types'

export const acrossApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as AcrossTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as AcrossTradeRateInput, deps),
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

    const sourceTxStatus = await checkEvmSwapStatus({
      txHash,
      chainId,
      address,
      assertGetEvmChainAdapter,
      fetchIsSmartContractAddressQuery,
    })

    if (sourceTxStatus.status !== TxStatus.Confirmed) return sourceTxStatus

    const maybeTransferResponse = await acrossService.get<AcrossTransfer>(
      `${config.VITE_ACROSS_API_URL}/v1/transfers/${orderId}`,
    )

    if (maybeTransferResponse.isErr()) {
      const error = maybeTransferResponse.unwrapErr()

      // Across returns not_found.transfer until it indexes the deposit, usually seconds
      const isNotIndexed =
        axios.isAxiosError(error.cause) &&
        getAcrossApiError(error.cause.response?.data)?.code === 'not_found.transfer'

      return {
        buyTxHash: undefined,
        status: isNotIndexed ? TxStatus.Pending : TxStatus.Unknown,
        message: undefined,
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
    }
  },
}
