import type { MarketData } from '@shapeshiftoss/types'
import { SortOptionsKeys } from 'components/SortDropdown/types'

export enum MarketsCategories {
  TradingVolume = 'tradingVolume',
  MarketCap = 'marketCap',
  Trending = 'trending',
  TopMovers = 'topMovers',
  RecentlyAdded = 'recentlyAdded',
  OneClickDefi = 'oneClickDefiAssets',
  ThorchainDefi = 'thorchainDefi',
}

export const sortOptionsByCategory: Record<MarketsCategories, SortOptionsKeys[] | undefined> = {
  [MarketsCategories.TradingVolume]: undefined,
  [MarketsCategories.MarketCap]: undefined,
  [MarketsCategories.Trending]: [
    SortOptionsKeys.Volume,
    SortOptionsKeys.PriceChange,
    SortOptionsKeys.MarketCap,
  ],
  [MarketsCategories.TopMovers]: [
    SortOptionsKeys.Volume,
    SortOptionsKeys.PriceChange,
    SortOptionsKeys.MarketCap,
  ],
  [MarketsCategories.RecentlyAdded]: [
    SortOptionsKeys.Volume,
    SortOptionsKeys.PriceChange,
    SortOptionsKeys.MarketCap,
  ],
  [MarketsCategories.OneClickDefi]: [
    SortOptionsKeys.Apy,
    SortOptionsKeys.Volume,
    SortOptionsKeys.MarketCap,
  ],
  [MarketsCategories.ThorchainDefi]: [
    SortOptionsKeys.Apy,
    SortOptionsKeys.Volume,
    SortOptionsKeys.MarketCap,
  ],
}

export const marketDataBySortKey: Record<SortOptionsKeys, keyof MarketData | 'apy'> = {
  [SortOptionsKeys.Apy]: 'apy',
  [SortOptionsKeys.MarketCap]: 'marketCap',
  [SortOptionsKeys.Volume]: 'volume',
  [SortOptionsKeys.PriceChange]: 'changePercent24Hr',
}
