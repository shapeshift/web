import type { AssetId } from '@shapeshiftoss/caip'
import type { MarketCapResult, MarketData } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchMarketDataGraphQL, fetchTopMarketDataGraphQL } from '../marketData'

import { marketData as marketDataSlice } from '@/state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from '@/state/store'

const MARKET_DATA_POLLING_INTERVAL_MS = 60_000
const MARKET_DATA_STALE_TIME_MS = 55_000

type UseTopMarketDataQueryOptions = {
  enabled?: boolean
}

export function useTopMarketDataQuery(options: UseTopMarketDataQueryOptions = {}) {
  const dispatch = useAppDispatch()
  const { enabled = true } = options

  return useQuery({
    queryKey: ['graphql-top-market-data'],
    queryFn: async (): Promise<MarketCapResult> => {
      const data = await fetchTopMarketDataGraphQL()
      dispatch(marketDataSlice.actions.setCryptoMarketData(data))
      return data
    },
    enabled,
    refetchInterval: MARKET_DATA_POLLING_INTERVAL_MS,
    staleTime: MARKET_DATA_STALE_TIME_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    gcTime: MARKET_DATA_POLLING_INTERVAL_MS * 2,
  })
}

type UseDeltaMarketDataQueryOptions = {
  assetIds: AssetId[]
  enabled?: boolean
}

export function useDeltaMarketDataQuery(options: UseDeltaMarketDataQueryOptions) {
  const dispatch = useAppDispatch()
  const { assetIds, enabled = true } = options

  const stableQueryKey = useMemo(
    () => ['graphql-delta-market-data', [...assetIds].sort().join(',')],
    [assetIds],
  )

  return useQuery({
    queryKey: stableQueryKey,
    queryFn: async (): Promise<Record<AssetId, MarketData>> => {
      if (assetIds.length === 0) return {}

      const data = await fetchMarketDataGraphQL(assetIds)
      dispatch(marketDataSlice.actions.setCryptoMarketData(data))
      return data
    },
    enabled: enabled && assetIds.length > 0,
    refetchInterval: MARKET_DATA_POLLING_INTERVAL_MS,
    staleTime: MARKET_DATA_STALE_TIME_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    gcTime: MARKET_DATA_POLLING_INTERVAL_MS * 2,
  })
}

type UseSingleAssetMarketDataQueryOptions = {
  assetId: AssetId | undefined
  enabled?: boolean
}

export function useSingleAssetMarketDataQuery(options: UseSingleAssetMarketDataQueryOptions) {
  const dispatch = useAppDispatch()
  const { assetId, enabled = true } = options

  return useQuery({
    queryKey: ['graphql-single-market-data', assetId],
    queryFn: async (): Promise<MarketData | null> => {
      if (!assetId) return null

      const data = await fetchMarketDataGraphQL([assetId])
      if (data[assetId]) {
        dispatch(marketDataSlice.actions.setCryptoMarketData(data))
        return data[assetId]
      }
      return null
    },
    enabled: enabled && Boolean(assetId),
    staleTime: 30_000,
    gcTime: 60_000,
  })
}

type UseBatchMarketDataQueryOptions = {
  assetIds: AssetId[]
  enabled?: boolean
}

export function useBatchMarketDataQuery(options: UseBatchMarketDataQueryOptions) {
  const dispatch = useAppDispatch()
  const { assetIds, enabled = true } = options

  const stableQueryKey = useMemo(
    () => ['graphql-batch-market-data', [...assetIds].sort().join(',')],
    [assetIds],
  )

  return useQuery({
    queryKey: stableQueryKey,
    queryFn: async (): Promise<MarketCapResult> => {
      if (assetIds.length === 0) return {}

      const data = await fetchMarketDataGraphQL(assetIds)
      dispatch(marketDataSlice.actions.setCryptoMarketData(data))
      return data
    },
    enabled: enabled && assetIds.length > 0,
    staleTime: MARKET_DATA_STALE_TIME_MS,
    gcTime: MARKET_DATA_POLLING_INTERVAL_MS * 2,
  })
}
