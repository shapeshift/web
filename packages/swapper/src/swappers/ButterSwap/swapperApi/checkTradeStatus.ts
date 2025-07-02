import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { CheckTradeStatusInput, TradeStatus } from '../../../types'
import { butterSwapChainIdToChainId } from '../utils/helpers'
import { getBridgeInfoById, getBridgeInfoBySourceHash } from '../xhr'

// See: https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash
// Example endpoint: https://bs-router-v3.chainservice.io/api/queryBridgeInfoBySourceHash?sourceHash=0x...

// State mapping: 0 = pending, 1 = complete, 6 = refunded/failed
const BUTTER_SWAP_STATES = (() => ({
  Pending: 0,
  Confirmed: 1,
  Failed: 6,
}))()

// Cache butter IDs to avoid repeated API calls during polling
// We use a module-level cache instead of storing in swap.metadata because:
// 1. The butter ID is only available after transaction submission (not at quote time like chainflipSwapId)
// 2. checkTradeStatus doesn't have a mechanism to update swap state during polling
// 3. This approach is simpler and doesn't require changes to core types or polling logic
const butterIdCache = new Map<string, number>()

export const checkTradeStatus = async (input: CheckTradeStatusInput): Promise<TradeStatus> => {
  const { txHash } = input
  try {
    let butterId = butterIdCache.get(txHash)

    // Only fetch relayer info by source hash if we don't have the butter ID cached
    if (!butterId) {
      const infoResult = await getBridgeInfoBySourceHash(txHash)
      if (infoResult.isErr()) {
        return {
          status: TxStatus.Unknown,
          buyTxHash: undefined,
          message: infoResult.unwrapErr().message,
        }
      }
      const basicInfo = infoResult.unwrap()
      if (!basicInfo || !basicInfo.id) {
        return { status: TxStatus.Unknown, buyTxHash: undefined, message: undefined }
      }

      // Cache the relayer ID for future calls
      butterId = basicInfo.id
      butterIdCache.set(txHash, butterId)
    }

    // Get the detailed relayer info using the cached ID
    const detailedInfoResult = await getBridgeInfoById(butterId)
    if (detailedInfoResult.isErr()) {
      return {
        status: TxStatus.Unknown,
        buyTxHash: undefined,
        message: detailedInfoResult.unwrapErr().message,
      }
    }
    const detailedInfo = detailedInfoResult.unwrap()
    if (!detailedInfo) {
      return { status: TxStatus.Unknown, buyTxHash: undefined, message: undefined }
    }

    // Use toHash as the destination chain tx hash if present
    const destinationTxHash = detailedInfo.toHash ?? undefined
    const relayerTxHash = detailedInfo.relayerHash ?? undefined
    const relayerExplorerTxLink = detailedInfo.relayerChain?.scanUrl ?? undefined

    // State mapping: 0 = pending, 1 = complete, 6 = refunded/failed
    let status: TxStatus = (() => {
      // For BTC, be optimistic on buyTxHash as we update the balance once the TX hits the mempool
      if (
        destinationTxHash &&
        butterSwapChainIdToChainId(Number(detailedInfo.toChain.chainId)) ===
          KnownChainIds.BitcoinMainnet
      )
        return TxStatus.Confirmed

      switch (detailedInfo.state) {
        case BUTTER_SWAP_STATES.Pending:
          return TxStatus.Pending
        case BUTTER_SWAP_STATES.Confirmed:
          return TxStatus.Confirmed
        case BUTTER_SWAP_STATES.Failed:
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    // Clean up cache for completed/failed trades to prevent memory leaks
    if (status === TxStatus.Confirmed || status === TxStatus.Failed) {
      butterIdCache.delete(txHash)
    }

    return {
      status,
      buyTxHash: destinationTxHash,
      relayerTxHash,
      relayerExplorerTxLink,
      message: undefined,
    }
  } catch (e) {
    return { status: TxStatus.Unknown, buyTxHash: undefined, message: (e as Error).message }
  }
}
