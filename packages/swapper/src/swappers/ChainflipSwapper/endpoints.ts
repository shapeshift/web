import { TxStatus } from '@shapeshiftoss/unchained-client'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import type { SolanaComputeBudgetOptions } from '../../solana-utils'
import { getSolanaTransactionFees, getUnsignedSolanaTransaction } from '../../solana-utils'
import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
import type { SwapperApi } from '../../types'
import { getExecutableTradeStep, getSwapMetadata, isExecutableTradeQuote } from '../../utils'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utxo-utils'
import { ChainflipStatusMessage } from './constants'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import type { ChainFlipStatus } from './types'
import { chainflipService } from './utils/chainflipService'
import { getLatestChainflipStatusMessage } from './utils/getLatestChainflipStatusMessage'

// Chainflip deposit addresses are program-owned and require a higher compute floor than a regular transfer
const solanaComputeBudget: SolanaComputeBudgetOptions = {
  marginMultiplier: 1.6,
  minComputeUnits: 50_000,
}

export const chainflipApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, solanaComputeBudget)
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
