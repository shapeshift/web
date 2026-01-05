import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe, MarketData } from '@shapeshiftoss/types'

import { fetchFiatPriceHistoryGraphQL, fetchFiatRateGraphQL } from './fiatData'
import { fetchMarketDataGraphQL } from './marketData'
import { fetchPriceHistoryGraphQL } from './priceHistoryData'

import type { SupportedFiatCurrencies } from '@/lib/market-service'
import { marketData as marketDataSlice } from '@/state/slices/marketDataSlice/marketDataSlice'
import { store } from '@/state/store'

export async function fetchAndDispatchMarketData(assetIds: AssetId[]): Promise<void> {
  if (assetIds.length === 0) return

  const data = await fetchMarketDataGraphQL(assetIds)
  store.dispatch(marketDataSlice.actions.setCryptoMarketData(data))
}

export async function fetchAndDispatchSingleAssetMarketData(
  assetId: AssetId,
): Promise<MarketData | null> {
  const data = await fetchMarketDataGraphQL([assetId])
  if (data[assetId]) {
    store.dispatch(marketDataSlice.actions.setCryptoMarketData(data))
    return data[assetId]
  }
  return null
}

export async function fetchAndDispatchPriceHistory(
  assetId: AssetId,
  timeframe: HistoryTimeframe,
): Promise<void> {
  await fetchPriceHistoryGraphQL(assetId, timeframe)
}

export async function fetchAndDispatchFiatMarketData(
  symbol: SupportedFiatCurrencies,
): Promise<void> {
  const data = await fetchFiatRateGraphQL(symbol)
  if (data) {
    store.dispatch(marketDataSlice.actions.setFiatMarketData({ [symbol]: data }))
  }
}

export async function fetchAndDispatchFiatPriceHistory(
  symbol: SupportedFiatCurrencies,
  timeframe: HistoryTimeframe,
): Promise<void> {
  const data = await fetchFiatPriceHistoryGraphQL(symbol, timeframe)
  store.dispatch(
    marketDataSlice.actions.setFiatPriceHistory({
      args: { symbol, timeframe },
      data,
    }),
  )
}
