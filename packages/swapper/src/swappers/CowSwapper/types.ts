import type { ChainId } from '@shapeshiftmonorepo/caip'
import type { OrderCreation } from '@shapeshiftmonorepo/types'

export type CowSwapGetTradesResponse = {
  txHash: string
}[]

export type CowSwapGetTransactionsResponse = {
  status: 'presignaturePending' | 'open' | 'fulfilled' | 'cancelled' | 'expired'
}[]

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
