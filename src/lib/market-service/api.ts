import type {
  FindAllMarketType,
  MarketData,
  MarketDataArgs,
  PriceHistoryType,
} from '@shapeshiftoss/types'

import type { FiatPriceHistoryType, FindByFiatMarketType } from './fiat-market-service-types'

export type FindByAssetIdMarketType = (args: MarketDataArgs) => Promise<MarketData | null>

export interface MarketService {
  baseUrl: string
  findAll: FindAllMarketType
  findPriceHistoryByAssetId: PriceHistoryType
  findByAssetId: FindByAssetIdMarketType
}

export interface FiatMarketService {
  baseUrl: string
  findPriceHistoryByFiatSymbol: FiatPriceHistoryType
  findByFiatSymbol: FindByFiatMarketType
}
