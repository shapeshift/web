import { getCosmosSdkTransactionFees, getUnsignedCosmosSdkTransaction } from '../../cosmossdk-utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import { checkTradeStatus } from '../../thorchain-utils'
import type { SwapperApi } from '../../types'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utxo-utils'
import { getTradeQuote } from './getTradeQuote'
import { getTradeRate } from './getTradeRate'

export const mayachainApi: SwapperApi = {
  getTradeRate,
  getTradeQuote,
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
