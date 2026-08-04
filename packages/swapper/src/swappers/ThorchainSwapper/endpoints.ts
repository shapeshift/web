import type { SwapperApi } from '../../types'
import { SwapperName } from '../../types'
import { getCosmosSdkTransactionFees, getUnsignedCosmosSdkTransaction } from '../../utils/cosmossdk'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getSolanaTransactionFees, getUnsignedSolanaTransaction } from '../../utils/solana'
import type { ThorTradeQuoteInput, ThorTradeRateInput } from '../../utils/thorchain'
import { checkTradeStatus, tron } from '../../utils/thorchain'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'

const swapperName = SwapperName.Thorchain

export const thorchainApi: SwapperApi = {
  getTradeRate: (input, deps) => getTradeRate(input as ThorTradeRateInput, deps),
  getTradeQuote: (input, deps) => getTradeQuote(input as ThorTradeQuoteInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedCosmosSdkTransaction,
  getCosmosSdkTransactionFees,
  getUnsignedSolanaTransaction,
  getSolanaTransactionFees,
  getUnsignedTronTransaction: input => tron.getUnsignedTronTransaction(input, swapperName),
  getTronTransactionFees: input => tron.getTronTransactionFees(input, swapperName),
  checkTradeStatus: input => {
    const { config } = input

    const nodeUrl = `${config.VITE_THORCHAIN_NODE_URL}/thorchain`
    const apiUrl = `${config.VITE_UNCHAINED_THORCHAIN_HTTP_URL}/api/v1`

    return checkTradeStatus({ ...input, nodeUrl, apiUrl, nativeChain: 'THOR' })
  },
}
