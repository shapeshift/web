import type { SwapperApi } from '../../types'
import { getCosmosSdkTransactionFees, getUnsignedCosmosSdkTransaction } from '../../utils/cosmossdk'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import type { ThorTradeQuoteInput, ThorTradeRateInput } from '../../utils/thorchain'
import { checkTradeStatus } from '../../utils/thorchain'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { getTradeQuote } from './getTradeQuote'
import { getTradeRate } from './getTradeRate'

export const mayachainApi: SwapperApi = {
  getTradeRate: (input, deps) => getTradeRate(input as ThorTradeRateInput, deps),
  getTradeQuote: (input, deps) => getTradeQuote(input as ThorTradeQuoteInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedCosmosSdkTransaction,
  getCosmosSdkTransactionFees,
  checkTradeStatus: input => {
    const { config } = input

    const nodeUrl = `${config.VITE_MAYACHAIN_NODE_URL}/mayachain`
    const apiUrl = `${config.VITE_UNCHAINED_MAYACHAIN_HTTP_URL}/api/v1`

    return checkTradeStatus({ ...input, nodeUrl, apiUrl, nativeChain: 'MAYA' })
  },
}
