import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData, HistoryTimeframe, MarketData, PartialRecord } from '@shapeshiftoss/types'
import type { SupportedFiatCurrencies } from 'lib/market-service'

export type PriceHistoryData<T extends SupportedFiatCurrencies | AssetId> = PartialRecord<
  T,
  HistoryData[]
>
export type PriceHistoryByTimeframe<T extends SupportedFiatCurrencies | AssetId> = PartialRecord<
  HistoryTimeframe,
  PriceHistoryData<T>
>

export type MarketDataById<T extends SupportedFiatCurrencies | AssetId> = PartialRecord<
  T,
  MarketData
>

export type MarketDataStateVariant<T extends SupportedFiatCurrencies | AssetId> = {
  byId: MarketDataById<T>
  priceHistory: PriceHistoryByTimeframe<T>
  ids: T[]
}

export type FiatMarketDataState = MarketDataStateVariant<SupportedFiatCurrencies>
export type CryptoMarketDataState = MarketDataStateVariant<AssetId>

export type MarketDataState = {
  crypto: CryptoMarketDataState
  fiat: FiatMarketDataState
  isMarketDataLoaded: boolean
}

export type FindPriceHistoryByAssetIdArgs = { assetId: AssetId; timeframe: HistoryTimeframe }
