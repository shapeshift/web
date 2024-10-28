import type { MarketData } from '@shapeshiftoss/types'
import type { SortOption } from 'components/SortDropdown/types'
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

export const sortOptionsByCategory: Record<MARKETS_CATEGORIES, SortOption[] | undefined> = {
  [MARKETS_CATEGORIES.TRADING_VOLUME]: undefined,
  [MARKETS_CATEGORIES.MARKET_CAP]: undefined,
  [MARKETS_CATEGORIES.TRENDING]: [
    {
      key: SortOptionsKeys.VOLUME,
      label: 'dashboard.portfolio.volume',
    },
    {
      key: SortOptionsKeys.PRICE_CHANGE,
      label: 'dashboard.portfolio.priceChange',
    },
    {
      key: SortOptionsKeys.MARKET_CAP,
      label: 'dashboard.portfolio.marketCap',
    },
  ],
  [MARKETS_CATEGORIES.TOP_MOVERS]: [
    {
      key: SortOptionsKeys.VOLUME,
      label: 'dashboard.portfolio.volume',
    },
    {
      key: SortOptionsKeys.PRICE_CHANGE,
      label: 'dashboard.portfolio.priceChange',
    },
    {
      key: SortOptionsKeys.MARKET_CAP,
      label: 'dashboard.portfolio.marketCap',
    },
  ],
  [MARKETS_CATEGORIES.RECENTLY_ADDED]: [
    {
      key: SortOptionsKeys.VOLUME,
      label: 'dashboard.portfolio.volume',
    },
    {
      key: SortOptionsKeys.PRICE_CHANGE,
      label: 'dashboard.portfolio.priceChange',
    },
    {
      key: SortOptionsKeys.MARKET_CAP,
      label: 'dashboard.portfolio.marketCap',
    },
  ],
  [MARKETS_CATEGORIES.ONE_CLICK_DEFI]: [
    {
      key: SortOptionsKeys.APY,
      label: 'common.apy',
    },
    {
      key: SortOptionsKeys.VOLUME,
      label: 'dashboard.portfolio.volume',
    },
    {
      key: SortOptionsKeys.MARKET_CAP,
      label: 'dashboard.portfolio.marketCap',
    },
  ],
  [MARKETS_CATEGORIES.THORCHAIN_DEFI]: [
    {
      key: SortOptionsKeys.APY,
      label: 'common.apy',
    },
    {
      key: SortOptionsKeys.VOLUME,
      label: 'dashboard.portfolio.volume',
    },
    {
      key: SortOptionsKeys.MARKET_CAP,
      label: 'dashboard.portfolio.marketCap',
    },
  ],
}

export const marketDataBySortKey: Record<SortOptionsKeys, keyof MarketData | 'apy'> = {
  [SortOptionsKeys.APY]: 'apy',
  [SortOptionsKeys.MARKET_CAP]: 'marketCap',
  [SortOptionsKeys.VOLUME]: 'volume',
  [SortOptionsKeys.PRICE_CHANGE]: 'changePercent24Hr',
}
