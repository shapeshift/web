import type { AssetId } from '@shapeshiftoss/caip'
import type { SupportedFiatCurrencies } from '@shapeshiftoss/market-service'
import type { HistoryData, HistoryTimeframe, MarketData } from '@shapeshiftoss/types'

export type PriceHistoryData = {
  [k: AssetId]: HistoryData[] | undefined
}

export type PriceHistoryByTimeframe = {
  [k in HistoryTimeframe]: PriceHistoryData
}

export type MarketDataStateVariant<T extends string> = {
  byId: {
    [k in T]?: MarketData
  }
  priceHistory: PriceHistoryByTimeframe
  ids: T[]
}

export type FiatMarketDataState = MarketDataStateVariant<SupportedFiatCurrencies>
export type CryptoMarketDataState = MarketDataStateVariant<AssetId>

export type MarketDataState = {
  crypto: CryptoMarketDataState
  fiat: FiatMarketDataState
}

export type FindPriceHistoryByAssetIdArgs = { assetId: AssetId; timeframe: HistoryTimeframe }
