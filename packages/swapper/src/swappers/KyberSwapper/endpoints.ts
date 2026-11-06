import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getKyberTradeQuote } from './swapperApi/getKyberTradeQuote'
import { getKyberTradeRate } from './swapperApi/getKyberTradeRate'
import type { KyberTradeQuoteInput, KyberTradeRateInput } from './types'

export const kyberApi: SwapperApi = {
  getTradeQuote: (input, deps) => getKyberTradeQuote(input as KyberTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getKyberTradeRate(input as KyberTradeRateInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  checkTradeStatus: checkEvmSwapStatus,
}
