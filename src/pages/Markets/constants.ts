export const gridTemplateColumnSx = {
  base: 'minmax(0, 1fr)',
  md: 'repeat(3, 1fr)',
  lg: 'repeat(3, 1fr)',
  xl: 'repeat(4, 1fr)',
}
export const gridTemplateRowsSx = { base: 'minmax(0, 1fr)', md: 'repeat(2, 1fr)' }
export const colSpanSparklineSx = { base: 1, md: 8 }
export const colSpanSmallSx = { base: 1, md: 4 }
export const colSpanSx = { base: 1, md: 5 }
export const rowSpanSparklineSx = { base: 1, md: 2 }

export enum MARKETS_CATEGORIES {
  TRADING_VOLUME = 'tradingVolume',
  MARKET_CAP = 'marketCap',
  TRENDING = 'trending',
  TOP_MOVERS = 'topMovers',
  RECENTLY_ADDED = 'recentlyAdded',
  ONE_CLICK_DEFI = 'oneClickDefiAssets',
  THORCHAIN_DEFI = 'thorchainDefi',
}
