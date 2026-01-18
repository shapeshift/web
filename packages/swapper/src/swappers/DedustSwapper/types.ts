import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'

import type { SwapErrorRight } from '../../types'

export type DedustSupportedChainId = typeof KnownChainIds.TonMainnet

export const dedustSupportedChainIds = [KnownChainIds.TonMainnet] as const

export type DedustAssetAddress = {
  type: 'native' | 'jetton'
  address: string
}

export type DedustAssetValidationResult =
  | {
      isValid: true
      sellAssetAddress: DedustAssetAddress
      buyAssetAddress: DedustAssetAddress
    }
  | {
      isValid: false
      error: Result<never, SwapErrorRight>
    }

export type DedustQuote = {
  poolAddress: string
  sellAssetAddress: string
  buyAssetAddress: string
  sellAmount: string
  buyAmount: string
  minBuyAmount: string
  gasBudget: string
  quoteTimestamp: number
}

export type DedustPoolType = 'STABLE' | 'VOLATILE'

export type DedustTradeSpecific = {
  poolAddress: string
  poolType: DedustPoolType
  sellAssetAddress: string
  buyAssetAddress: string
  sellAmount: string
  minBuyAmount: string
  gasBudget: string
  quoteTimestamp: number
}
