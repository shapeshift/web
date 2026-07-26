import type { ChainId } from '@shapeshiftoss/caip'
import type { OrderCreation } from '@shapeshiftoss/types'

import type { GetEvmTradeQuoteInputBase, GetEvmTradeRateInput } from '../../types'

export type CowSwapTradeQuoteInput = GetEvmTradeQuoteInputBase
export type CowSwapTradeRateInput = GetEvmTradeRateInput

export type CowSwapGetTradesResponse = {
  txHash: string
}[]

export type CowSwapOrdersResponse = {
  status: 'presignaturePending' | 'open' | 'fulfilled' | 'cancelled' | 'expired'
}

export type AffiliateAppDataFragment = {
  partnerFee?: {
    bps: number
    recipient: string
  }
}

export type CowMessageToSign = {
  chainId: ChainId
  orderToSign: Omit<OrderCreation, 'signature'>
}
