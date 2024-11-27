import type { ChainId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { OrderCreation, OrderError } from '@shapeshiftoss/types/dist/cowSwap'

export type CowSwapError = {
  errorType: OrderError
  description: string
  // This is not documented by CoW API so we shouldn't make assumptions about the shape, nor presence of this guy
  data?: any
}

export enum CowNetwork {
  Mainnet = 'mainnet',
  Xdai = 'xdai',
  ArbitrumOne = 'arbitrum_one',
}

export type CowChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.GnosisMainnet
  | KnownChainIds.ArbitrumMainnet

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
