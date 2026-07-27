import { getCosmosSdkTransactionFees, getUnsignedCosmosSdkTransaction } from '../../utils/cosmossdk'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import type { SolanaComputeBudgetOptions } from '../../utils/solana'
import { getSolanaTransactionFees, getUnsignedSolanaTransaction } from '../../utils/solana'
import { checkTradeStatus, tron } from '../../utils/thorchain'
import type { SwapperApi } from '../../types'
import { SwapperName } from '../../types'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'

const swapperName = SwapperName.Thorchain

// The deposit is a fixed transfer (150 CU) + memo (~370 CU/byte, 20k-45k measured on mainnet) and
// execution re-simulates the same instructions, so the estimate is exact and the margin is safety only
const solanaComputeBudget: SolanaComputeBudgetOptions = { marginMultiplier: 1.1 }

export const thorchainApi: SwapperApi = {
  getTradeRate,
  getTradeQuote,
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedCosmosSdkTransaction,
  getCosmosSdkTransactionFees,
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, { computeBudget: solanaComputeBudget })
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
  },
  getUnsignedTronTransaction: input => tron.getUnsignedTronTransaction(input, swapperName),
  getTronTransactionFees: input => tron.getTronTransactionFees(input, swapperName),
  checkTradeStatus: input => {
    const { config } = input

    const nodeUrl = `${config.VITE_THORCHAIN_NODE_URL}/thorchain`
    const apiUrl = `${config.VITE_UNCHAINED_THORCHAIN_HTTP_URL}/api/v1`

    return checkTradeStatus({ ...input, nodeUrl, apiUrl, nativeChain: 'THOR' })
  },
}
