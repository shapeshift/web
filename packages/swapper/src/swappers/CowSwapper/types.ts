import type { ChainId } from '@shapeshiftoss/caip'
import type { OrderCreation } from '@shapeshiftoss/types'

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
