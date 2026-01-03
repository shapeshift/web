import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { fetchMarketDataGraphQL } from './marketData'

import { marketData as marketDataSlice } from '@/state/slices/marketDataSlice/marketDataSlice'
import { selectPortfolioAssetIds } from '@/state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const GRAPHQL_MARKET_DATA_POLL_INTERVAL = 60_000 // 60 seconds
const MAX_CONSECUTIVE_FAILURES = 3

type UseGraphQLMarketDataOptions = {
  enabled?: boolean
  assetIds?: AssetId[]
}

type UseGraphQLMarketDataResult = ReturnType<typeof useQuery> & {
  shouldUseLegacyFallback: boolean
}

/**
 * Hook to fetch market data via GraphQL with DataLoader batching.
 *
 * Key differences from the existing findAll approach:
 * - Only fetches the assets you actually need (portfolio assets by default)
 * - Server-side batching via DataLoader reduces upstream API calls
 * - Automatic polling with 60s interval
 * - Falls back to legacy API after MAX_CONSECUTIVE_FAILURES failures
 *
 * The server batches all requested assetIds into minimal CoinGecko/CoinCap calls.
 */
export function useGraphQLMarketData(
  options: UseGraphQLMarketDataOptions = {},
): UseGraphQLMarketDataResult {
  const dispatch = useAppDispatch()
  const portfolioAssetIds = useAppSelector(selectPortfolioAssetIds)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  // Use provided assetIds or fall back to portfolio assets
  const assetIds = options.assetIds ?? portfolioAssetIds

  const shouldUseLegacyFallback = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES

  const onSuccess = useCallback(() => {
    setConsecutiveFailures(0)
  }, [])

  const onError = useCallback(() => {
    setConsecutiveFailures(prev => prev + 1)
  }, [])

  const query = useQuery({
    queryKey: ['graphql-market-data', assetIds],
    queryFn: async () => {
      if (assetIds.length === 0) return {}

      try {
        console.log(`[GraphQL] Fetching market data for ${assetIds.length} assets`)
        const data = await fetchMarketDataGraphQL(assetIds)

        // Dispatch to Redux store (same as existing flow)
        dispatch(marketDataSlice.actions.setCryptoMarketData(data))

        onSuccess()
        return data
      } catch (error) {
        console.error('[GraphQL] Market data fetch failed:', error)
        onError()
        throw error
      }
    },
    enabled: options.enabled !== false && assetIds.length > 0 && !shouldUseLegacyFallback,
    refetchInterval: GRAPHQL_MARKET_DATA_POLL_INTERVAL,
    staleTime: GRAPHQL_MARKET_DATA_POLL_INTERVAL,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  return { ...query, shouldUseLegacyFallback }
}

/**
 * Fetch market data for arbitrary assets via GraphQL (non-polling).
 * Useful for one-off fetches outside of the main polling flow.
 */
export function useGraphQLMarketDataQuery(assetIds: AssetId[], enabled = true) {
  const dispatch = useAppDispatch()

  return useQuery({
    queryKey: ['graphql-market-data-query', assetIds],
    queryFn: async () => {
      if (assetIds.length === 0) return {}

      const data = await fetchMarketDataGraphQL(assetIds)

      // Dispatch to Redux store
      dispatch(marketDataSlice.actions.setCryptoMarketData(data))

      return data
    },
    enabled: enabled && assetIds.length > 0,
    staleTime: GRAPHQL_MARKET_DATA_POLL_INTERVAL,
  })
}
