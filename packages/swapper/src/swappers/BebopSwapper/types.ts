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
    toSign: any
    onchainOrderType?: string
    solver?: string
    makers?: string[]
    tx: {
      to: Address
      from: Address
      data: Hex
      value: Hex
      gas?: string
    }
    partnerFee?: Record<Address, string>
    protocolFee?: Record<Address, string>
  }
}

export type BebopQuoteResponse = {
  routes: BebopQuoteRoute[]
  errors: Record<string, any>
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
