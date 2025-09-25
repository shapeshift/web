import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { OrderDirection } from '@/components/OrderDropdown/types'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import {
  getCoingeckoMarkets,
  getCoingeckoRecentlyAdded,
  getCoingeckoTopMovers,
  getCoingeckoTrending,
} from '@/lib/coingecko/utils'
import type { CoinGeckoSortKey } from '@/lib/market-service/coingecko/coingecko'

/**
 * Hook to prefetch category queries for better user experience
 * Excludes OneClickDefi to avoid rate limiting issues with Portals API
 */
export const usePrefetchExploreCategories = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['coinGeckoTrending', OrderDirection.Descending, SortOptionsKeys.Volume],
      queryFn: getCoingeckoTrending,
      staleTime: Infinity,
    })

    queryClient.prefetchQuery({
      queryKey: ['coinGeckoTopMovers', OrderDirection.Descending, SortOptionsKeys.Volume],
      queryFn: getCoingeckoTopMovers,
      staleTime: Infinity,
    })

    queryClient.prefetchQuery({
      queryKey: ['coinGeckoRecentlyAdded', OrderDirection.Descending, SortOptionsKeys.Volume],
      queryFn: getCoingeckoRecentlyAdded,
      staleTime: Infinity,
    })

    const marketCapDescOrder: CoinGeckoSortKey = 'market_cap_desc'
    queryClient.prefetchQuery({
      queryKey: ['coinGeckoMarkets', marketCapDescOrder, 1, 250],
      queryFn: () => getCoingeckoMarkets(marketCapDescOrder, 1, 250),
      staleTime: Infinity,
    })
  }, [queryClient])
}
