import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import type { GetEvmTradeQuoteInputBase, GetEvmTradeRateInput, SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { getZrxTradeRate } from './getZrxTradeRate/getZrxTradeRate'

export const zrxApi: SwapperApi = {
  getTradeQuote: async (input, deps) => {
    const tradeQuoteResult = await getZrxTradeQuote(input as GetEvmTradeQuoteInputBase, deps)

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  getTradeRate: async (input, deps) => {
    const tradeRateResult = await getZrxTradeRate(input as GetEvmTradeRateInput, deps)

    return tradeRateResult.map(tradeRate => [tradeRate])
  },
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  checkTradeStatus: checkEvmSwapStatus,
}
