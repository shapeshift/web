import type { HistoryData, MarketData } from '@shapeshiftoss/types'

import { FiatMarketProviders } from './fiat-market-providers'
import type {
  FiatMarketDataArgs,
  FiatPriceHistoryArgs,
  FiatPriceHistoryType,
} from './fiat-market-service-types'

export const findByFiatSymbol = async ({ symbol }: FiatMarketDataArgs) => {
  let result: MarketData | null = null
  // Loop through market providers and look for fiat market data. Once found, exit loop.
  for (let i = 0; i < FiatMarketProviders.length && !result; i++) {
    try {
      result = await FiatMarketProviders[i].findByFiatSymbol({ symbol })
    } catch (e) {
      // Swallow error, not every fiat will be with every provider.
    }
  }
  if (!result) return null
  return result
}

export const findPriceHistoryByFiatSymbol: FiatPriceHistoryType = async ({
  symbol,
  timeframe,
}: FiatPriceHistoryArgs): Promise<HistoryData[]> => {
  let result: HistoryData[] | null = null
  // Loop through market providers and look for fiat price history data. Once found, exit loop.
  for (let i = 0; i < FiatMarketProviders.length && !result?.length; i++) {
    try {
      result = await FiatMarketProviders[i].findPriceHistoryByFiatSymbol({ symbol, timeframe })
    } catch (e) {
      // Swallow error, not every fiat will be with every provider.
    }
  }
  if (!result) return []
  return result
}
