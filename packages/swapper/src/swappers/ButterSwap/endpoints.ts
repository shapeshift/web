import type { SwapperApi } from '../../types'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

export const butterSwapApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  checkTradeStatus: () => {
    // TODO(gomes): Implement checkTradeStatus
    throw new Error('checkTradeStatus Not implemented')
  },
}
