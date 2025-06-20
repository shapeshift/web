import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { CheckTradeStatusInput, TradeStatus } from '../../../types'

export const checkTradeStatus = async (_input: CheckTradeStatusInput): Promise<TradeStatus> => {
  return await Promise.resolve({
    status: TxStatus.Unknown,
    buyTxHash: undefined,
    message: undefined,
  })
}
