import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import type { SolanaComputeBudgetOptions } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
import { getUnsignedTronTransaction } from '../../tron-utils/getUnsignedTronTransaction'
import type { SwapperApi } from '../../types'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utxo-utils'
import { checkTradeStatus } from './swapperApi/checkTradeStatus'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

const solanaComputeBudget: SolanaComputeBudgetOptions = { marginMultiplier: 1.6 }

export const butterSwapApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  checkTradeStatus,
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, solanaComputeBudget)
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
  },
  getTronTransactionFees,
  getUnsignedTronTransaction,
}
