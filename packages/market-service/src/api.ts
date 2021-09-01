import { CoinGeckoMarketService } from './coingecko/coingecko'

export type AssetMarketData = {
  name: string
  symbol: string
  network: string
  identifier?: string
  price: string
  marketCap: string
  volume: string
  icon: string
  changePercent24Hr: number
  description?: string
  contractAddress?: string
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

type AssetDataType = (network: string, contractAddress?: string) => Promise<AssetMarketData | null>

type PriceHistoryType = (
  network: string,
  timeframe: HistoryTimeframe,
  contractAddress?: string
) => Promise<HistoryData[]>

export interface MarketService {
  baseUrl: string

  getAssetData: AssetDataType

  getPriceHistory: PriceHistoryType
}

export const getDefaultMarketService = (): MarketService => {
  return new CoinGeckoMarketService()
}

export const getAssetData: AssetDataType = async (network, contractAddress) => {
  return getDefaultMarketService().getAssetData(network, contractAddress)
}

export const getAssetHistory: PriceHistoryType = (
  network,
  timeline,
  contractAddress
): Promise<HistoryData[]> => {
  return getDefaultMarketService().getPriceHistory(network, timeline, contractAddress)
}
