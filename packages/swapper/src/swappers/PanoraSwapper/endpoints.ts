import type { SwapperApi } from '../../types'
import {
  checkAptosSwapStatus,
  getAptosTransactionFees,
  getUnsignedAptosTransaction,
} from '../../utils/aptos'
import { getPanoraTradeQuote } from './swapperApi/getPanoraTradeQuote'
import { getPanoraTradeRate } from './swapperApi/getPanoraTradeRate'
import type { PanoraTradeQuoteInput, PanoraTradeRateInput } from './types'

export const panoraApi: SwapperApi = {
  getTradeQuote: (input, deps) => getPanoraTradeQuote(input as PanoraTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getPanoraTradeRate(input as PanoraTradeRateInput, deps),
  getUnsignedAptosTransaction,
  getAptosTransactionFees,
  checkTradeStatus: checkAptosSwapStatus,
}
