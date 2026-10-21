import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import type { LcxLibertyTradeQuoteInput, LcxLibertyTradeRateInput } from './types'

export const lcxLibertyApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as LcxLibertyTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as LcxLibertyTradeRateInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  checkTradeStatus: checkEvmSwapStatus,
}
