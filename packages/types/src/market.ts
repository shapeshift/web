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
  caip19: string
  timeframe: HistoryTimeframe
}

export type MarketDataArgs = {
  caip19: string
}

export type FindAllMarketType = (args: FindAllMarketArgs) => Promise<MarketCapResult>
export type FindByCaip19MarketType = (args: MarketDataArgs) => Promise<MarketData>

export type PriceHistoryType = (args: PriceHistoryArgs) => Promise<HistoryData[]>

export type FindAllMarketArgs = {
  pages: number
  perPage: number
}

export type MarketCapResult = {
  [k: string]: MarketData
}
