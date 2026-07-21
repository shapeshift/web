import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import type { GetEvmTradeQuoteInputBase, GetEvmTradeRateInput, SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { getZrxTradeRate } from './getZrxTradeRate/getZrxTradeRate'

export const zrxApi: SwapperApi = {
  getTradeQuote: async (input, { assertGetEvmChainAdapter, assetsById, config }) => {
    const tradeQuoteResult = await getZrxTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      assetsById,
      config.VITE_ZRX_BASE_URL,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  getTradeRate: async (input, { assetsById, config }) => {
    const tradeRateResult = await getZrxTradeRate(
      input as GetEvmTradeRateInput,
      assetsById,
      config.VITE_ZRX_BASE_URL,
    )

    return tradeRateResult.map(tradeRate => [tradeRate])
  },
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  checkTradeStatus: checkEvmSwapStatus,
}
