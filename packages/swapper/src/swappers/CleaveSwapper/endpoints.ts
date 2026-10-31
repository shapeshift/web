import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import type { CleaveTradeQuoteInput, CleaveTradeRateInput } from './types'

export const cleaveApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as CleaveTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as CleaveTradeRateInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  checkTradeStatus: checkEvmSwapStatus,
}
