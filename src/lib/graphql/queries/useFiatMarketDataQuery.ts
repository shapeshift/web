import type { HistoryData, HistoryTimeframe, MarketData } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'

import { fetchFiatPriceHistoryGraphQL, fetchFiatRateGraphQL } from '../fiatData'

import type { SupportedFiatCurrencies } from '@/lib/market-service'
import { marketData as marketDataSlice } from '@/state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from '@/state/store'

type UseFiatRateQueryOptions = {
  symbol: SupportedFiatCurrencies
  enabled?: boolean
}

export function useFiatRateQuery(options: UseFiatRateQueryOptions) {
  const dispatch = useAppDispatch()
  const { symbol, enabled = true } = options

  return useQuery({
    queryKey: ['graphql-fiat-rate', symbol],
    queryFn: async (): Promise<MarketData | null> => {
      const data = await fetchFiatRateGraphQL(symbol)
      if (data) {
        dispatch(marketDataSlice.actions.setFiatMarketData({ [symbol]: data }))
      }
      return data
    },
    enabled,
    staleTime: 60_000,
    gcTime: 120_000,
  })
}

type UseFiatPriceHistoryQueryOptions = {
  symbol: SupportedFiatCurrencies
  timeframe: HistoryTimeframe
  enabled?: boolean
}

export function useFiatPriceHistoryQuery(options: UseFiatPriceHistoryQueryOptions) {
  const dispatch = useAppDispatch()
  const { symbol, timeframe, enabled = true } = options

  return useQuery({
    queryKey: ['graphql-fiat-price-history', symbol, timeframe],
    queryFn: async (): Promise<HistoryData[]> => {
      const data = await fetchFiatPriceHistoryGraphQL(symbol, timeframe)
      dispatch(
        marketDataSlice.actions.setFiatPriceHistory({
          args: { symbol, timeframe },
          data,
        }),
      )
      return data
    },
    enabled,
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

type UseFiatMarketDataQueryOptions = {
  symbol: SupportedFiatCurrencies
  timeframe: HistoryTimeframe
  enabled?: boolean
}

export function useFiatMarketDataQuery(options: UseFiatMarketDataQueryOptions) {
  const { symbol, timeframe, enabled = true } = options

  const rateQuery = useFiatRateQuery({ symbol, enabled })
  const historyQuery = useFiatPriceHistoryQuery({ symbol, timeframe, enabled })

  return {
    rateQuery,
    historyQuery,
    isLoading: rateQuery.isLoading || historyQuery.isLoading,
    isError: rateQuery.isError || historyQuery.isError,
    error: rateQuery.error || historyQuery.error,
  }
}
