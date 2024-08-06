import type { MarketData } from '@shapeshiftoss/types'

import type { ZerionMarketData } from './types'

export const zerionMarketDataToMarketData = (zerionMarketData: ZerionMarketData): MarketData => {
  return {
    price: zerionMarketData.price.toString(),
    marketCap: zerionMarketData.market_cap.toString(),
    volume: '0', // Not available from Zerion API
    changePercent24Hr: zerionMarketData.changes.percent_1d,
    supply: zerionMarketData.circulating_supply.toString(),
    maxSupply: zerionMarketData.total_supply.toString(),
  }
}
