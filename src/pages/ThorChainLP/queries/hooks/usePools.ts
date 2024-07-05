import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { MidgardPoolResponse } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { bn } from 'lib/bignumber/bignumber'
import type { MidgardSwapHistoryResponse } from 'lib/utils/thorchain/lp/types'
import { selectAssets, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { Pool, VolumeStats } from './usePool'
import { getPool, getVolumeStats, selectSwapsData } from './usePool'

export type { Pool } from './usePool'

export const usePools = () => {
  const assets = useAppSelector(selectAssets)
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const selectPools = useCallback(
    (midgardPools: MidgardPoolResponse[]) => {
      if (!midgardPools?.length) return []

      return midgardPools
        .reduce<Pool[]>((acc, midgardPool) => {
          const pool = getPool(midgardPool, assets, runeMarketData.price)
          if (!pool) return acc
          acc.push(pool)
          return acc
        }, [])
        .sort((a, b) => bn(b.runeDepth).comparedTo(a.runeDepth))
    },
    [assets, runeMarketData],
  )

  const pools = useQuery({
    ...reactQueries.midgard.poolsData(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // 5 minutes, since this is related to pools data, not user data - we can afford to have this stale for longer
    staleTime: 60_000 * 5,
    select: selectPools,
  })

  const swapsDataQueries = useMemo(
    () => ({
      queries: (pools.data ?? []).map(pool => ({
        ...reactQueries.midgard.swapsData(pool.asset, 'hour', 7 * 24),
        select: (swapsData: MidgardSwapHistoryResponse) => selectSwapsData(swapsData, pool.asset),
      })),
    }),
    [pools.data],
  )

  const swapsData = useQueries(swapsDataQueries)

  const volumeStatsByThorchainNotationPoolAssetId = useMemo(
    () =>
      swapsData.reduce<Record<string, VolumeStats>>((acc, query) => {
        const { data } = query
        if (!data) return acc
        const { thorchainNotationPoolAssetId } = data

        acc[thorchainNotationPoolAssetId] = getVolumeStats(data, runeMarketData.price)

        return acc
      }, {}),
    [runeMarketData.price, swapsData],
  )

  const poolsWithVolumeStats = useMemo(() => {
    const data = (pools.data ?? []).reduce<Pool[]>((acc, pool) => {
      if (!pool) return acc
      const volumeStats = volumeStatsByThorchainNotationPoolAssetId[pool.asset]
      if (!volumeStats) return acc

      acc.push({ ...pool, ...volumeStats })
      return acc
    }, [])

    return { ...pools, data }
  }, [pools, volumeStatsByThorchainNotationPoolAssetId])

  return poolsWithVolumeStats
}
