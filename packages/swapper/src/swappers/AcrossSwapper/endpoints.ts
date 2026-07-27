import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getSolanaTransactionFees } from '../../utils/solana/getSolanaTransactionFees'
import type { SolanaComputeBudgetOptions } from '../../utils/solana/getUnsignedSolanaTransaction'
import { getUnsignedSolanaTransaction } from '../../utils/solana/getUnsignedSolanaTransaction'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { acrossService } from './utils/acrossService'
import type {
  AcrossDepositStatus,
  AcrossTradeQuoteInput,
  AcrossTradeRateInput,
} from './utils/types'

// Solana-origin routes are CCTP-only (no swap legs) with constant measured compute
// consumption, so the margin is safety only
const solanaComputeBudget: SolanaComputeBudgetOptions = { marginMultiplier: 1.1 }

export const acrossApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as AcrossTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as AcrossTradeRateInput, deps),
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, { computeBudget: solanaComputeBudget })
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
  },
  checkTradeStatus: async ({
    txHash,
    chainId,
    address,
    config,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    if (isEvmChainId(chainId)) {
      const sourceTxStatus = await checkEvmSwapStatus({
        txHash,
        chainId,
        address,
        assertGetEvmChainAdapter,
        fetchIsSmartContractAddressQuery,
      })

      if (sourceTxStatus.status !== TxStatus.Confirmed) return sourceTxStatus

      txHash = sourceTxStatus.buyTxHash ?? txHash
    }

    const maybeStatusResponse = await acrossService.get<AcrossDepositStatus>(
      `${config.VITE_ACROSS_API_URL}/deposit/status?depositTxnRef=${txHash}`,
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
        case 'filled':
          return TxStatus.Confirmed
        case 'pending':
          return TxStatus.Pending
        case 'slowFillRequested':
          return TxStatus.Pending
        case 'expired':
          return TxStatus.Failed
        case 'refunded':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    const message = (() => {
      switch (statusResponse.status) {
        case 'pending':
          return 'Deposit detected, processing...'
        case 'slowFillRequested':
          return 'Taking longer than usual, waiting for fill...'
        case 'expired':
          return 'Deposit expired'
        case 'refunded':
          return 'Deposit refunded on origin chain'
        default:
          return undefined
      }
    })()

    const buyTxHash = statusResponse.fillTxnRef

    return {
      status,
      buyTxHash,
      message,
    }
  },
}
