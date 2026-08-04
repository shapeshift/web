import type { SwapperApi } from '../../types'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getSolanaTransactionFees } from '../../utils/solana/getSolanaTransactionFees'
import { getUnsignedSolanaTransaction } from '../../utils/solana/getUnsignedSolanaTransaction'
import { getTronTransactionFees, getUnsignedTronTransaction } from '../../utils/tron'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { checkTradeStatus } from './swapperApi/checkTradeStatus'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import type { ButterSwapTradeQuoteInput, ButterSwapTradeRateInput } from './types'

export const butterSwapApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as ButterSwapTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as ButterSwapTradeRateInput, deps),
  checkTradeStatus,
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedSolanaTransaction,
  getSolanaTransactionFees,
  getTronTransactionFees,
  getUnsignedTronTransaction,
}
