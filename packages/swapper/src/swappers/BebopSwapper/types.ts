import { KnownChainIds } from '@shapeshiftoss/types'
import type { Address } from 'viem'

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

export type BebopRoute = 'PMM' | 'JAM'

export type BebopToken = {
  address: Address
  symbol: string
  name: string
  decimals: number
}

export type BebopGasFee = {
  native: string
  usd: string
}

export type BebopSettlement = {
  buyToken: Address
  sellToken: Address
  buyAmount: string
  sellAmount: string
  expiryTime: number
  settlementAddress: Address
}

export type BebopQuoteRoute = {
  type: string // "PMMv3" or "JAMv2" etc
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
      data: string
      value: string
      gas?: string
    }
    partnerFee?: Record<Address, string> // Fee amounts per token address
    protocolFee?: Record<Address, string> // Protocol fee amounts per token address
  }
}

export type BebopQuoteResponse = {
  routes: BebopQuoteRoute[]
  errors: Record<string, any>
  link: string
  bestPrice: string // Route type name like "PMMv3" or "JAMv2"
}

export type BebopPriceResponse = {
  status: string
  routes: {
    route: BebopRoute
    sellAmount: string
    buyAmount: string
    gasFee: BebopGasFee
  }[]
  bestPrice?: number
  error?: {
    message: string
    code: number
  }
}

export type BebopErrorResponse = {
  error: {
    message: string
    code: number
    details?: string
  }
}

// Chain name mapping for Bebop API
export const chainIdToBebopChain: Record<BebopSupportedChainId, string> = {
  [KnownChainIds.EthereumMainnet]: 'ethereum',
  [KnownChainIds.PolygonMainnet]: 'polygon',
  [KnownChainIds.ArbitrumMainnet]: 'arbitrum',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.AvalancheMainnet]: 'avalanche',
  [KnownChainIds.OptimismMainnet]: 'optimism',
  [KnownChainIds.BnbSmartChainMainnet]: 'bsc',
}

// Native token address used by Bebop
export const BEBOP_NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
