import { KnownChainIds } from '@shapeshiftoss/types'
import type { Address, Hex } from 'viem'

export const bebopSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
] as const

export type BebopSupportedChainId = (typeof bebopSupportedChainIds)[number]

export type BebopQuoteRoute = {
  type: string
  quote: {
    requestId: string
    type: string
    status: string
    quoteId: string
    chainId: number
    approvalType: 'Standard' | 'Permit2'
    nativeToken: string
    taker: Address
    receiver: Address
    expiry: number
    slippage: number
    gasFee: {
      native: string
      usd: number
    }
    buyTokens: Record<
      Address,
      {
        amount: string
        decimals: number
        priceUsd: number
        symbol: string
        minimumAmount: string
        price: number
        priceBeforeFee: number
        amountBeforeFee: string
        deltaFromExpected: number
      }
    >
    sellTokens: Record<
      Address,
      {
        amount: string
        decimals: number
        priceUsd: number
        symbol: string
        price: number
        priceBeforeFee: number
      }
    >
    settlementAddress: Address
    approvalTarget: Address
    requiredSignatures: string[]
    priceImpact: number
    warnings: string[]
    toSign: {
      partner_id: number
      expiry: number
      taker_address: Address
      maker_address: Address
      maker_nonce: string
      taker_token: Address
      maker_token: Address
      taker_amount: string
      maker_amount: string
      receiver: Address
      packed_commands: string
    }
    onchainOrderType?: string
    solver?: string
    makers?: string[]
    partialFillOffset?: number
    tx: {
      to: Address
      from: Address
      data: Hex
      value: Hex
      gas?: number
      gasPrice?: number
    }
    partnerFee?: Record<Address, string>
    protocolFee?: Record<Address, string>
  }
}

// Bebop error responses - route failures during quote aggregation
export type BebopError = {
  errorCode: number
  message: string
  requestId: string
}

export type BebopQuoteResponse = {
  routes: BebopQuoteRoute[]
  errors: Record<string, BebopError>
  link: string
  bestPrice: string
}

export const chainIdToBebopChain: Record<BebopSupportedChainId, string> = {
  [KnownChainIds.EthereumMainnet]: 'ethereum',
  [KnownChainIds.PolygonMainnet]: 'polygon',
  [KnownChainIds.ArbitrumMainnet]: 'arbitrum',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.AvalancheMainnet]: 'avalanche',
  [KnownChainIds.OptimismMainnet]: 'optimism',
  [KnownChainIds.BnbSmartChainMainnet]: 'bsc',
}

export const BEBOP_NATIVE_MARKER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// Dummy address used for rate quotes when no wallet is connected.
// This is Vitalik's address, same as what Bebop's own UI uses for price-only quotes.
// MUST NEVER be used for executable quote transactions.
export const BEBOP_DUMMY_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address
