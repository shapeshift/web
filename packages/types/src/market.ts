import { ChainTypes } from '.'

export type MarketData = {
  price: string
  marketCap: string
  volume: string
  changePercent24Hr: number
}

export enum HistoryTimeframe {
  HOUR = '1H',
  DAY = '24H',
  WEEK = '1W',
  MONTH = '1M',
  YEAR = '1Y',
  ALL = 'All'
}

export type HistoryData = {
  price: number
  date: string
}

export type PriceHistoryArgs = {
  chain: ChainTypes
  timeframe: HistoryTimeframe
  tokenId?: string
}

export type MarketDataArgs = {
  chain: ChainTypes
  tokenId?: string
}

export type MarketDataType = (args: MarketDataArgs) => Promise<MarketData>

export type PriceHistoryType = (args: PriceHistoryArgs) => Promise<HistoryData[]>

export type GetByMarketCapArgs = {
  pages: number
  perPage: number
}

export type MarketCapResult = {
  [k: string]: MarketData
}
export type GetByMarketCapType = (args?: GetByMarketCapArgs) => Promise<MarketCapResult>
