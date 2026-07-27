import { getTronTransactionFees } from '../../utils/tron'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import type { SolanaComputeBudgetOptions } from '../../utils/solana'
import { getSolanaTransactionFees, getUnsignedSolanaTransaction } from '../../utils/solana'
import type { SwapperApi } from '../../types'
import { getExecutableTradeStep, getSwapMetadata, isExecutableTradeQuote } from '../../utils'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { ChainflipStatusMessage } from './constants'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import type { ChainFlipStatus, ChainflipTradeQuoteInput, ChainflipTradeRateInput } from './types'
import { chainflipService } from './utils/chainflipService'
import { getLatestChainflipStatusMessage } from './utils/getLatestChainflipStatusMessage'

// Deposits are plain (token) transfers with constant measured compute consumption (max 15394 CU
// with ata creation), so the margin is safety only; the floor guarantees the limit covers full
// ata recreation if the deposit ata is closed between simulation and landing (a no-op create
// simulates ~3x cheaper than a real one)
const solanaComputeBudget: SolanaComputeBudgetOptions = {
  marginMultiplier: 1.1,
  minComputeUnits: 20_000,
}

export const chainflipApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as ChainflipTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as ChainflipTradeRateInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, { computeBudget: solanaComputeBudget })
  },
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
  },
  getUnsignedTronTransaction: ({ stepIndex, tradeQuote, from, assertGetTronChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, chainflipSpecific, sellAsset } = step

    if (!chainflipSpecific?.depositAddress) throw Error('Missing deposit address')

    const adapter = assertGetTronChainAdapter(sellAsset.chainId)

    return adapter.buildSendApiTransaction({
      to: chainflipSpecific.depositAddress,
      from,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      accountNumber,
      chainSpecific: { contractAddress: contractAddressOrUndefined(sellAsset.assetId) },
    })
  },
  getTronTransactionFees,
  checkTradeStatus: async ({ config, swap }) => {
    if (!swap) throw new Error('Missing swap')

    const { swapId } = getSwapMetadata(swap.metadata.swapperMetadata, 'chainflip')

    const brokerUrl = config.VITE_CHAINFLIP_API_URL
    const apiKey = config.VITE_CHAINFLIP_API_KEY

    const maybeStatusResponse = await chainflipService.get<ChainFlipStatus>(
      `${brokerUrl}/status-by-id?apiKey=${apiKey}&swapId=${swapId}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        // assume the swap is not yet seen on that call
        message: ChainflipStatusMessage.WaitingForDeposit,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()
    const {
      status: { swapEgress },
    } = statusResponse

    // Assume no outbound Tx is a pending Tx
    if (!swapEgress?.transactionReference) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Pending,
        message: getLatestChainflipStatusMessage(statusResponse),
      }
    }

    // Assume as soon as we have an outbound Tx, the swap is complete.
    // Chainflip waits for 3 confirmations to assume complete (vs. 1 for us), which is turbo long.
    return {
      buyTxHash: swapEgress.transactionReference,
      status: TxStatus.Confirmed,
      message: undefined,
    }
  },
}
