import type { MarketData } from '@shapeshiftoss/types'

import type { ZerionMarketData } from './types'

export const zerionMarketDataToMarketData = (zerionMarketData: ZerionMarketData): MarketData => {
  const {
    price,
    market_cap: marketCap,
    changes,
    circulating_supply: supply,
    total_supply: maxSupply,
  } = zerionMarketData
  return {
    price: price ? price.toString() : '0',
    marketCap: marketCap ? marketCap.toString() : '0',
    volume: '0', // Not available from Zerion API
    changePercent24Hr: changes.percent_1d ? changes.percent_1d : 0,
    supply: supply ? supply.toString() : '0',
    maxSupply: maxSupply ? maxSupply.toString() : '0',
  }
}
