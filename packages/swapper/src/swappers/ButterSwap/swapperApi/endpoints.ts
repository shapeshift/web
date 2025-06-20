import type { SwapperApi } from '../../../types'
import { checkTradeStatus } from './checkTradeStatus'
import { getTradeQuote } from './getTradeQuote'
import { getTradeRate } from './getTradeRate'

export const butterSwapApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  checkTradeStatus,
}
