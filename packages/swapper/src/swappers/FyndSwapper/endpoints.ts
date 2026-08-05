import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import type { FyndTradeQuoteInput, FyndTradeRateInput } from './types'

export const fyndApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as FyndTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as FyndTradeRateInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  checkTradeStatus: checkEvmSwapStatus,
}
