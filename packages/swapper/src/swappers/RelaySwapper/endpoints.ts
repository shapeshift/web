import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import { checkSafeTransactionStatus, getSwapMetadata } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getSolanaTransactionFees } from '../../utils/solana/getSolanaTransactionFees'
import { getUnsignedSolanaTransaction } from '../../utils/solana/getUnsignedSolanaTransaction'
import { getTronTransactionFees, getUnsignedTronTransaction } from '../../utils/tron'
import { getUnsignedUtxoTransaction, getUtxoTransactionFees } from '../../utils/utxo'
import { chainIdToRelayChainId } from './constant'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { getLatestRelayStatusMessage } from './utils/getLatestRelayStatusMessage'
import { notifyTransactionIndexing } from './utils/notifyTransactionIndexing'
import { getRelayRequestConfig, relayService } from './utils/relayService'
import type { RelayStatus, RelayTradeQuoteInput, RelayTradeRateInput } from './utils/types'

// Keep track of the trades we already notified the relay indexer about
const txIndexingMap: Map<string, boolean> = new Map()

export const relayApi: SwapperApi = {
  getTradeQuote: (input, deps) => {
    return getTradeQuote(input as RelayTradeQuoteInput, deps, chainIdToRelayChainId)
  },
  getTradeRate: (input, deps) => {
    return getTradeRate(input as RelayTradeRateInput, deps, chainIdToRelayChainId)
  },
  getEvmTransactionFees,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction,
  getUtxoTransactionFees,
  getSolanaTransactionFees,
  getUnsignedSolanaTransaction,
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

    // relay.link tracks the swap by its origin chain transaction
    const swapperTxId = txHash
    const swapperTxLink = `https://relay.link/transaction/${txHash}`

    const maybeStatusResponse = await relayService.get<RelayStatus>(
      `${config.VITE_RELAY_API_URL}/intents/status/v3?requestId=${relayMetadata.relayId}`,
      getRelayRequestConfig(config),
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        swapperTxId,
        swapperTxLink,
        message: undefined,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()

    const status = (() => {
      switch (statusResponse.status) {
        case 'success':
          return TxStatus.Confirmed
        case 'waiting':
        case 'delayed':
        case 'pending':
        case 'depositing':
        case 'submitted':
          return TxStatus.Pending
        case 'failure':
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
      swapperTxId,
      swapperTxLink,
      message: getLatestRelayStatusMessage(statusResponse),
    }
  },
}
