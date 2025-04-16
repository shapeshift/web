import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import type { SwapperApi } from '../../types'
import { checkSolanaSwapStatus } from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

export const jupiterApi: SwapperApi = {
  getTradeRate,
  getTradeQuote,
  getUnsignedSolanaTransaction,
  getSolanaTransactionFees,
  checkTradeStatus: checkSolanaSwapStatus,
}
