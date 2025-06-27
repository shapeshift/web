import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { CheckTradeStatusInput, TradeStatus } from '../../../types'
import { getBridgeInfoBySourceHash } from '../xhr'

// See: https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash
// Example endpoint: https://bs-router-v3.chainservice.io/api/queryBridgeInfoBySourceHash?sourceHash=0x...

// State mapping: 0 = pending, 1 = complete, 6 = refunded/failed
const BUTTER_SWAP_STATES = (() => ({
  Pending: 0,
  Confirmed: 1,
  Failed: 6,
}))()

export const checkTradeStatus = async (input: CheckTradeStatusInput): Promise<TradeStatus> => {
  const { txHash } = input
  try {
    const info = await getBridgeInfoBySourceHash(txHash)
    if (!info) {
      return { status: TxStatus.Unknown, buyTxHash: undefined, message: 'No data from ButterSwap' }
    }
    // State mapping: 0 = pending, 1 = complete, 6 = refunded/failed
    let status: TxStatus = (() => {
      switch (info.state) {
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
    // Use toHash as the destination chain tx hash if present
    const buyTxHash = info.toHash || undefined
    return { status, buyTxHash, message: undefined }
  } catch (e) {
    return { status: TxStatus.Unknown, buyTxHash: undefined, message: (e as Error).message }
  }
}
