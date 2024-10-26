import type { SwapperApi } from '../../types'

import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getUnsignedEvmTransaction } from './swapperApi/getUnsignedEvmTransaction'
import { checkTradeStatus } from './swapperApi/checkTradeStatus'

export const chainflipApi: SwapperApi = {
  getTradeQuote,
  getUnsignedEvmTransaction,
  checkTradeStatus
}
