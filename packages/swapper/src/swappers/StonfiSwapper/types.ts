import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import type { Quote } from '@ston-fi/omniston-sdk'

import type { SwapErrorRight } from '../../types'

export type StonfiSupportedChainId = typeof KnownChainIds.TonMainnet

export const stonfiSupportedChainIds = [KnownChainIds.TonMainnet] as const

export type OmnistonAssetAddress = {
  blockchain: number
  address: string
}

export type TonAssetValidationResult =
  | {
      isValid: true
      bidAssetAddress: OmnistonAssetAddress
      askAssetAddress: OmnistonAssetAddress
    }
  | {
      isValid: false
      error: Result<never, SwapErrorRight>
    }

export type QuoteResult =
  | { type: 'success'; quote: Quote }
  | { type: 'noQuote' }
  | { type: 'timeout' }
  | { type: 'error'; error: unknown }

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
  bidAssetAddress: OmnistonAssetAddress
  askAssetAddress: OmnistonAssetAddress
  bidUnits: string
  askUnits: string
  referrerAddress?: OmnistonAssetAddress
  referrerFeeAsset?: OmnistonAssetAddress
  referrerFeeUnits: string
  protocolFeeAsset?: OmnistonAssetAddress
  protocolFeeUnits: string
  quoteTimestamp: number
  estimatedGasConsumption: string
  params?: unknown
}
