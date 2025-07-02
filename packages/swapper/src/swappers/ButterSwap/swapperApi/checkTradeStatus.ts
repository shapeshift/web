import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { CheckTradeStatusInput, TradeStatus } from '../../../types'
import { getBridgeInfoById, getBridgeInfoBySourceHash } from '../xhr'

// See: https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash
// Example endpoint: https://bs-router-v3.chainservice.io/api/queryBridgeInfoBySourceHash?sourceHash=0x...

// State mapping: 0 = pending, 1 = complete, 6 = refunded/failed
const BUTTER_SWAP_STATES = (() => ({
  Pending: 0,
  Confirmed: 1,
  Failed: 6,
}))()

// Cache relay IDs to avoid repeated API calls during polling
// We use a module-level cache instead of storing in swap.metadata because:
// 1. The relay ID is only available after transaction submission (not at quote time like chainflipSwapId)
// 2. checkTradeStatus doesn't have a mechanism to update swap state during polling
// 3. This approach is simpler and doesn't require changes to core types or polling logic
const relayIdCache = new Map<string, number>()

export const checkTradeStatus = async (input: CheckTradeStatusInput): Promise<TradeStatus> => {
  const { txHash } = input
  try {
    let relayId = relayIdCache.get(txHash)

    // Only fetch relay info by source hash if we don't have the relay ID cached
    if (!relayId) {
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

      // Cache the relay ID for future calls
      relayId = basicInfo.id
      relayIdCache.set(txHash, relayId)
    }

    // Get the detailed relay info using the cached ID
    const detailedInfoResult = await getBridgeInfoById(relayId)
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

    // State mapping: 0 = pending, 1 = complete, 6 = refunded/failed
    let status: TxStatus = (() => {
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
      relayIdCache.delete(txHash)
    }

    // Use toHash as the destination chain tx hash if present
    const buyTxHash = detailedInfo.toHash ?? undefined
    // Use relayerHash as the relayer transaction hash
    const relayerTxHash = detailedInfo.relayerHash ?? undefined
    return { status, buyTxHash, relayerTxHash, message: undefined }
  } catch (e) {
    return { status: TxStatus.Unknown, buyTxHash: undefined, message: (e as Error).message }
  }
}
