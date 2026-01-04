import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'

import { fetchMarketDataGraphQL } from './marketData'

import { marketData as marketDataSlice } from '@/state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from '@/state/store'

const POLL_INTERVAL_MS = 60_000

type UseGraphQLDeltaMarketDataOptions = {
  assetIds: AssetId[]
  enabled?: boolean
}

export function useGraphQLDeltaMarketData(options: UseGraphQLDeltaMarketDataOptions) {
  const dispatch = useAppDispatch()
  const { assetIds, enabled = true } = options

  return useQuery({
    queryKey: ['graphql-delta-market-data', assetIds],
    queryFn: async () => {
      if (assetIds.length === 0) return {}

      console.log(
        `[GraphQL] Fetching delta market data for ${assetIds.length} assets not in top 2000`,
      )
      const data = await fetchMarketDataGraphQL(assetIds)
      dispatch(marketDataSlice.actions.setCryptoMarketData(data))
      return data
    },
    enabled: enabled && assetIds.length > 0,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS - 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  })
}
