import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads/build'
import type { Asset } from 'lib/asset-service'

import type { SwapErrorRight, SwapperName, TradeQuote2 } from './api'

export type TradeQuoteDeps = {
  assets: Partial<Record<AssetId, Asset>>
  sellAssetUsdRate: string
  buyAssetUsdRate: string
  feeAssetUsdRate: string
  runeAssetUsdRate: string
}

export type QuoteResult = Result<TradeQuote2, SwapErrorRight> & {
  swapperName: SwapperName
}
