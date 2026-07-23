import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../evm-utils'
import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import type { SolanaComputeBudgetOptions } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import { getTronTransactionFees } from '../../tron-utils/getTronTransactionFees'
import { getUnsignedTronTransaction } from '../../tron-utils/getUnsignedTronTransaction'
import type { SwapperApi } from '../../types'
import { checkSafeTransactionStatus, getSwapMetadata } from '../../utils'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utxo-utils'
import { chainIdToRelayChainId } from './constant'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { getLatestRelayStatusMessage } from './utils/getLatestRelayStatusMessage'
import { notifyTransactionIndexing } from './utils/notifyTransactionIndexing'
import { relayService } from './utils/relayService'
import type { RelayStatus, RelayTradeQuoteInput, RelayTradeRateInput } from './utils/types'

// Keep track of the trades we already notified the relay indexer about
const txIndexingMap: Map<string, boolean> = new Map()

// Bridge-out deposits measure constant compute consumption, but same-chain routes swap through
// Jupiter where pool state moving between simulation and landing (CLMM tick crossings) measured
// ~4% drift on a live route; 1.4 matches Jupiter's dynamicComputeUnitLimit margin
const solanaComputeBudget: SolanaComputeBudgetOptions = { marginMultiplier: 1.4 }

export const relayApi: SwapperApi = {
  getTradeQuote: (input, deps) =>
    getTradeQuote(input as RelayTradeQuoteInput, deps, chainIdToRelayChainId),
  getTradeRate: (input, deps) =>
    getTradeRate(input as RelayTradeRateInput, deps, chainIdToRelayChainId),
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getSolanaTransactionFees: input => {
    return getSolanaTransactionFees(input, { computeBudget: solanaComputeBudget })
  },
  getUnsignedSolanaTransaction: input => {
    return getUnsignedSolanaTransaction(input, { computeBudget: solanaComputeBudget })
  },
  getTronTransactionFees,
  getUnsignedTronTransaction,
  checkTradeStatus: async ({
    swap,
    txHash,
    chainId,
    address,
    config,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }) => {
    const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      address,
      fetchIsSmartContractAddressQuery,
    })

    if (!swap) throw new Error('Missing swap')

    const relayMetadata = getSwapMetadata(swap.metadata.swapperMetadata, 'relay')

    if (maybeSafeTransactionStatus) {
      // return any safe transaction status that has not yet executed on chain (no buyTxHash)
      if (!maybeSafeTransactionStatus.buyTxHash) return maybeSafeTransactionStatus

      // The safe buyTxHash is the on chain transaction hash (not the safe transaction hash).
      // Mutate txHash and continue with regular status check flow.
      txHash = maybeSafeTransactionStatus.buyTxHash
    }

    if (
      relayMetadata &&
      !txIndexingMap.has(swap.id) &&
      chainIdToRelayChainId[chainId] !== undefined
    ) {
      // relay's /transactions/single indexer `tx` param is the EVM calldata (see spec)
      await notifyTransactionIndexing(
        {
          requestId: relayMetadata.relayId,
          chainId: chainIdToRelayChainId[chainId].toString(),
          tx: relayMetadata.data ?? '',
        },
        config,
      )

      txIndexingMap.set(swap.id, true)
    }

    const maybeStatusResponse = await relayService.get<RelayStatus>(
      `${config.VITE_RELAY_API_URL}/intents/status/v2?requestId=${relayMetadata.relayId}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()

    const status = (() => {
      switch (statusResponse.status) {
        case 'success':
          return TxStatus.Confirmed
        case 'pending':
          return TxStatus.Pending
        case 'failed':
        case 'refund':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    // Relay refers to in Txs as "inTxHashes" but to out Txs as simply "txHashes" when they really mean "outTxHashes"
    // One thing to note is that for same-chain Txs, there is no "out Tx" per se since the in Tx *is* the out Tx
    const outTxHashes = statusResponse.txHashes
    const isSameChainSwap = statusResponse.destinationChainId === statusResponse.originChainId
    const buyTxHash = isSameChainSwap ? txHash : outTxHashes?.[0]

    return {
      status,
      buyTxHash,
      message: getLatestRelayStatusMessage(statusResponse),
    }
  },
}
