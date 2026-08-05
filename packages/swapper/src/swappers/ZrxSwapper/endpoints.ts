import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { getZrxTradeRate } from './getZrxTradeRate/getZrxTradeRate'
import type { ZrxTradeQuoteInput, ZrxTradeRateInput } from './types'

export const zrxApi: SwapperApi = {
  getTradeQuote: (input, deps) => getZrxTradeQuote(input as ZrxTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getZrxTradeRate(input as ZrxTradeRateInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  checkTradeStatus: checkEvmSwapStatus,
}
