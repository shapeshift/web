import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'

import { fetchPriceHistoryGraphQL } from '../priceHistoryData'

type UsePriceHistoryQueryOptions = {
  assetId: AssetId | undefined
  timeframe: HistoryTimeframe
  enabled?: boolean
}

export function usePriceHistoryQuery(options: UsePriceHistoryQueryOptions) {
  const { assetId, timeframe, enabled = true } = options

  return useQuery({
    queryKey: ['graphql-price-history', assetId, timeframe],
    queryFn: (): Promise<HistoryData[]> => {
      if (!assetId) return Promise.resolve([])
      return fetchPriceHistoryGraphQL(assetId, timeframe)
    },
    enabled: enabled && Boolean(assetId),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}
