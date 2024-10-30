import type { SwapperApi } from '../../types'
import { checkTradeStatus } from './swapperApi/checkTradeStatus'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getUnsignedEvmTransaction } from './swapperApi/getUnsignedEvmTransaction'
import { getUnsignedUtxoTransaction } from './swapperApi/getUnsignedUtxoTransaction'

export const chainflipApi: SwapperApi = {
  getTradeQuote,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction,
  checkTradeStatus,
}
