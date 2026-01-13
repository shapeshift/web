import { KnownChainIds } from '@shapeshiftoss/types'

export type StonfiSupportedChainId = typeof KnownChainIds.TonMainnet

export const stonfiSupportedChainIds = [KnownChainIds.TonMainnet] as const

export type StonfiQuote = {
  quoteId: string
  resolverId: string
  resolverName: string
  bidAssetAddress: string
  askAssetAddress: string
  bidUnits: string
  askUnits: string
  gasBudget: string
  estimatedGasConsumption: string
  tradeStartDeadline: number
}

export type StonfiTradeSpecific = {
  quoteId: string
  resolverId: string
  resolverName: string
  tradeStartDeadline: number
  gasBudget: string
}
