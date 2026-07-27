import { getTronTransactionFees, getUnsignedTronTransaction } from '../../utils/tron'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getSolanaTransactionFees } from '../../utils/solana/getSolanaTransactionFees'
import type { SolanaComputeBudgetOptions } from '../../utils/solana/getUnsignedSolanaTransaction'
import { getUnsignedSolanaTransaction } from '../../utils/solana/getUnsignedSolanaTransaction'
import type { SwapperApi } from '../../types'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
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
