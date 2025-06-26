import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { CheckTradeStatusInput, TradeStatus } from '../../../types'
import { getBridgeInfoBySourceHash } from '../xhr'

// See: https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash
// Example endpoint: https://bs-router-v3.chainservice.io/api/queryBridgeInfoBySourceHash?sourceHash=0x...

export const checkTradeStatus = async (input: CheckTradeStatusInput): Promise<TradeStatus> => {
  const { txHash } = input
  try {
    const info = await getBridgeInfoBySourceHash(txHash)
    if (!info) {
      return { status: TxStatus.Unknown, buyTxHash: undefined, message: 'No data from ButterSwap' }
    }
    // State mapping: 0 = pending, 1 = complete, 6 = refunded/failed
    let status: TxStatus = TxStatus.Unknown
    if (info.state === 0) status = TxStatus.Pending
    else if (info.state === 1) status = TxStatus.Confirmed
    else if (info.state === 6) status = TxStatus.Failed
    // Use toHash as the destination chain tx hash if present
    const buyTxHash = info.toHash || undefined
    return { status, buyTxHash, message: undefined }
  } catch (e) {
    return { status: TxStatus.Unknown, buyTxHash: undefined, message: (e as Error).message }
  }
}
