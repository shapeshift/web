import type { SwapperApi } from '../../types'

import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getUnsignedEvmTransaction } from './swapperApi/getUnsignedEvmTransaction'
import { getUnsignedUtxoTransaction } from './swapperApi/getUnsignedUtxoTransaction'
import { checkTradeStatus } from './swapperApi/checkTradeStatus'

export const chainflipApi: SwapperApi = {
  getTradeQuote,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction,
  checkTradeStatus
}
