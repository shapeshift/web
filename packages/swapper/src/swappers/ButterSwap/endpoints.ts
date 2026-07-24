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
import type { ButterSwapTradeQuoteInput, ButterSwapTradeRateInput } from './types'

// Jupiter swap legs can consume more units than simulated when pool state moves between
// simulation and landing (CLMM tick crossings), 1.4 matches Jupiter's dynamicComputeUnitLimit margin
const solanaComputeBudget: SolanaComputeBudgetOptions = { marginMultiplier: 1.4 }

export const butterSwapApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as ButterSwapTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as ButterSwapTradeRateInput, deps),
  checkTradeStatus,
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, { computeBudget: solanaComputeBudget })
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
  },
  getTronTransactionFees,
  getUnsignedTronTransaction,
}
