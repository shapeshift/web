import type { ChainId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { OrderCreation } from '@shapeshiftoss/types/dist/cowSwap'

// Most likely non-exhaustive, see https://github.com/cowprotocol/contracts/blob/aaffdc55b2a13738b7c32de96f487d3eb5b4f8c6/src/ts/api.ts#L110
// But we only handle a few of them for now so that's fine. Add other errors here as needed.
export enum CowSwapQuoteErrorType {
  SellAmountDoesNotCoverFee = 'SellAmountDoesNotCoverFee',
  NoLiquidity = 'NoLiquidity',
  ZeroAmount = 'ZeroAmount',
  UnsupportedToken = 'UnsupportedToken',
}

export type CowSwapQuoteError = {
  errorType: CowSwapQuoteErrorType
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
