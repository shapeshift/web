export enum ChainTypes {
  Ethereum = 'ethereum',
  Bitcoin = 'bitcoin',
  Litecoin = 'litecoin'
}

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

export type MarketDataType = (chain: ChainTypes, tokenId?: string) => Promise<MarketData | null>

export type PriceHistoryType = (
  chain: ChainTypes,
  timeframe: HistoryTimeframe,
  tokenId?: string
) => Promise<HistoryData[]>

export interface MarketService {
  baseUrl: string

  getMarketData: MarketDataType

  getPriceHistory: PriceHistoryType
}
