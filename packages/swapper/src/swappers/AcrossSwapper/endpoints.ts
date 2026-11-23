import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { acrossService } from './utils/acrossService'
import type {
  AcrossTradeQuoteInput,
  AcrossTradeRateInput,
  AcrossTransfersResponse,
} from './utils/types'

export const acrossApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as AcrossTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as AcrossTradeRateInput, deps),
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  checkTradeStatus: async ({
    txHash,
    chainId,
    address,
    config,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    const sourceTxStatus = await checkEvmSwapStatus({
      txHash,
      chainId,
      address,
      assertGetEvmChainAdapter,
      fetchIsSmartContractAddressQuery,
    })

    if (sourceTxStatus.status !== TxStatus.Confirmed) return sourceTxStatus

    const depositTxHash = sourceTxStatus.buyTxHash ?? txHash

    const maybeTransfersResponse = await acrossService.get<AcrossTransfersResponse>(
      `${config.VITE_ACROSS_API_URL}/v1/transfers`,
      { params: { txnRef: depositTxHash } },
    )

    if (maybeTransfersResponse.isErr()) {
      return { buyTxHash: undefined, status: TxStatus.Unknown, message: undefined }
    }

    const [transfer] = maybeTransfersResponse.unwrap().data.transfers

    // The deposit can land before Across indexes it
    if (!transfer) return { buyTxHash: undefined, status: TxStatus.Pending, message: undefined }

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
      swapperTxId: transfer.orderId,
    }
  },
}
