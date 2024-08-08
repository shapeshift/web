import type { AssetId } from '@shapeshiftoss/caip'

export type MarketData = {
  price: string
  marketCap: string
  volume: string
  changePercent24Hr: number
  supply?: string
  maxSupply?: string
}

export enum HistoryTimeframe {
  HOUR = '1H',
  DAY = '24H',
  WEEK = '1W',
  MONTH = '1M',
  YEAR = '1Y',
  ALL = 'All',
}

export type HistoryData = {
  price: number
  date: number
}

export type PriceHistoryArgs = {
  assetId: string
  timeframe: HistoryTimeframe
}

export type MarketDataArgs = {
  assetId: string
}

export type FindAllMarketType = (args: FindAllMarketArgs) => Promise<MarketCapResult>

export type PriceHistoryType = (args: PriceHistoryArgs) => Promise<HistoryData[]>

export type FindAllMarketArgs = {
  count: number
}

export type MarketCapResult = {
  [k: AssetId]: MarketData
}
