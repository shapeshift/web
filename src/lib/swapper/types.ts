import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads/build'
import type { Asset } from 'lib/asset-service'
import type { ReduxState } from 'state/reducer'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'

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

export type TradeExecutionInput = {
  swapperName: SwapperName
  tradeQuote: TradeQuote2
  stepIndex: number
  accountMetadata: AccountMetadata
  quoteSellAssetAccountId: AccountId
  quoteBuyAssetAccountId: AccountId
  wallet: HDWallet
  supportsEIP1559: boolean
  buyAssetUsdRate: string
  feeAssetUsdRate: string
  slippageTolerancePercentageDecimal: string
  getState: () => ReduxState
}
