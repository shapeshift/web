import type { AssetId } from '@shapeshiftoss/caip'
import type { SupportedFiatCurrencies } from '@shapeshiftoss/market-service'
import type { HistoryData, HistoryTimeframe, MarketData } from '@shapeshiftoss/types'
import type { PartialRecord } from 'lib/utils'

export type PriceHistoryData = PartialRecord<AssetId, HistoryData[]>
export type PriceHistoryByTimeframe = PartialRecord<HistoryTimeframe, PriceHistoryData>

export type MarketDataStateVariant<T extends string> = {
  byId: PartialRecord<T, MarketData>
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
