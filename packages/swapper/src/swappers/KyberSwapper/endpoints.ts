import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import type { KyberTradeQuoteInput, KyberTradeRateInput } from './types'

export const kyberApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as KyberTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as KyberTradeRateInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  checkTradeStatus: checkEvmSwapStatus,
}
