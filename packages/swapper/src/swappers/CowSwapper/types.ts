import type { ChainId } from '@shapeshiftoss/caip'
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

// Most likely non-exhaustive, see https://github.com/cowprotocol/contracts/blob/aaffdc55b2a13738b7c32de96f487d3eb5b4f8c6/src/ts/api.ts#L110
// But we only handle SellAmountDoesNotCoverFee for now so that's fine. Add other errors here as needed.
enum CowSwapQuoteErrorType {
  SellAmountDoesNotCoverFee = 'SellAmountDoesNotCoverFee',
  NoLiquidity = 'NoLiquidity',
}

export type CowSwapQuoteError = {
  errorType: CowSwapQuoteErrorType
  description: string
  // This is not documented by CoW API so we shouldn't make assumptions about the shape, nor presence of this guy
  data?: any
}

export enum CoWSwapOrderKind {
  Buy = 'buy',
  Sell = 'sell',
}

export enum CoWSwapSigningScheme {
  EIP712 = 'eip712',
  EIP1271 = 'eip1271',
  EthSign = 'ethsign',
  PreSign = 'presign',
}

export enum CoWSwapSellTokenSource {
  ERC20 = 'erc20',
  External = 'external',
  Internal = 'internal',
}

export enum CoWSwapBuyTokenDestination {
  ERC20 = 'erc20',
  Internal = 'internal',
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

export type CowSwapOrder = {
  sellToken: string
  buyToken: string
  sellAmount: string
  buyAmount: string
  validTo: number
  appData: string
  appDataHash: string
  feeAmount: string
  kind: string
  partiallyFillable: boolean
  receiver: string
  sellTokenBalance: CoWSwapSellTokenSource
  buyTokenBalance: CoWSwapBuyTokenDestination
  quoteId: number
  signingScheme: CoWSwapSigningScheme
}

export type CowMessageToSign = {
  chainId: ChainId
  orderToSign: CowSwapOrder
}
