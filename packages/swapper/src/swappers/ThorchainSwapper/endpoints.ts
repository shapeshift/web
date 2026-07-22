import { getCosmosSdkTransactionFees, getUnsignedCosmosSdkTransaction } from '../../cosmossdk-utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import { checkTradeStatus, solana, tron } from '../../thorchain-utils'
import type { SwapperApi } from '../../types'
import { SwapperName } from '../../types'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utxo-utils'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'

const swapperName = SwapperName.Thorchain

export const thorchainApi: SwapperApi = {
  getTradeRate,
  getTradeQuote,
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedSolanaTransaction: input => solana.getUnsignedSolanaTransaction(input, swapperName),
  getSolanaTransactionFees: input => solana.getSolanaTransactionFees(input, swapperName),
  getUnsignedTronTransaction: input => tron.getUnsignedTronTransaction(input, swapperName),
  getTronTransactionFees: input => tron.getTronTransactionFees(input, swapperName),
  getUnsignedCosmosSdkTransaction,
  getCosmosSdkTransactionFees,
  checkTradeStatus: input => {
    const { config } = input

    const nodeUrl = `${config.VITE_THORCHAIN_NODE_URL}/thorchain`
    const apiUrl = `${config.VITE_UNCHAINED_THORCHAIN_HTTP_URL}/api/v1`

    return checkTradeStatus({ ...input, nodeUrl, apiUrl, nativeChain: 'THOR' })
  },
}
