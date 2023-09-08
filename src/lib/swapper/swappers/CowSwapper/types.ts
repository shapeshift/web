import type { KnownChainIds } from '@shapeshiftoss/types'

export type CowSwapQuoteResponse = {
  quote: {
    sellToken: string
    buyToken: string
    receiver: string
    sellAmount: string
    buyAmount: string
    validTo: number
    appData: string
    feeAmount: string
    kind: string
    partiallyFillable: boolean
  }
  from: string
  expiration: string
  id: number
}

export enum CowNetwork {
  Mainnet = 'mainnet',
  Xdai = 'xdai',
}

export type CowChainId = KnownChainIds.EthereumMainnet | KnownChainIds.GnosisMainnet

export type CowSwapGetTradesResponse = {
  txHash: string
}[]

export type CowSwapGetTransactionsResponse = {
  status: 'presignaturePending' | 'open' | 'fulfilled' | 'cancelled' | 'expired'
}[]
