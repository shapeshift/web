import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData, HistoryTimeframe, MarketData } from '@shapeshiftoss/types'
import type { SupportedFiatCurrencies } from 'lib/market-service'
import type { PartialRecord } from 'lib/utils'

export type PriceHistoryData = PartialRecord<AssetId, HistoryData[]>
export type PriceHistoryByTimeframe = PartialRecord<HistoryTimeframe, PriceHistoryData>

export type MarketDataById<T extends string> = PartialRecord<T, MarketData>

export type MarketDataStateVariant<T extends string> = {
  byId: MarketDataById<T>
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
