import type { MarketData } from '@shapeshiftoss/types'
import { SortOptionsKeys } from 'components/SortDropdown/types'

export enum MARKETS_CATEGORIES {
  TRADING_VOLUME = 'tradingVolume',
  MARKET_CAP = 'marketCap',
  TRENDING = 'trending',
  TOP_MOVERS = 'topMovers',
  RECENTLY_ADDED = 'recentlyAdded',
  ONE_CLICK_DEFI = 'oneClickDefiAssets',
  THORCHAIN_DEFI = 'thorchainDefi',
}

export const sortOptionsByCategory: Record<MARKETS_CATEGORIES, SortOptionsKeys[] | undefined> = {
  [MARKETS_CATEGORIES.TRADING_VOLUME]: undefined,
  [MARKETS_CATEGORIES.MARKET_CAP]: undefined,
  [MARKETS_CATEGORIES.TRENDING]: [
    SortOptionsKeys.Volume,
    SortOptionsKeys.PriceChange,
    SortOptionsKeys.MarketCap,
  ],
  [MARKETS_CATEGORIES.TOP_MOVERS]: [
    SortOptionsKeys.Volume,
    SortOptionsKeys.PriceChange,
    SortOptionsKeys.MarketCap,
  ],
  [MARKETS_CATEGORIES.RECENTLY_ADDED]: [
    SortOptionsKeys.Volume,
    SortOptionsKeys.PriceChange,
    SortOptionsKeys.MarketCap,
  ],
  [MARKETS_CATEGORIES.ONE_CLICK_DEFI]: [
    SortOptionsKeys.Apy,
    SortOptionsKeys.Volume,
    SortOptionsKeys.MarketCap,
  ],
  [MARKETS_CATEGORIES.THORCHAIN_DEFI]: [
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
