import { thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import type { MidgardPoolResponse } from '@shapeshiftoss/swapper'
import { getChainIdBySwapper, SwapperName, thorPoolAssetIdToAssetId } from '@shapeshiftoss/swapper'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import type { Pool, VolumeStats } from './usePool'
import { getPool, getVolumeStats, selectSwapsData } from './usePool'

import { bn } from '@/lib/bignumber/bignumber'
import {
  isLpChainHalted,
  isLpDepositEnabled,
  isLpWithdrawEnabled,
} from '@/lib/utils/thorchain/hooks/useIsThorchainLpDepositEnabled'
import { useThorchainMimir } from '@/lib/utils/thorchain/hooks/useThorchainMimir'
import type { MidgardSwapHistoryResponse } from '@/lib/utils/thorchain/lp/types'
import { reactQueries } from '@/react-queries'
import { getInboundAddressesQuery } from '@/react-queries/queries/thornode'
import { selectInboundAddressData, selectIsTradingActive } from '@/react-queries/selectors'
import { selectAssets, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type { Pool } from './usePool'

export const usePools = () => {
  const { queryKey: inboundAddressDataQueryKey, queryFn: inboundAddressDataQueryFn } =
    getInboundAddressesQuery(getChainIdBySwapper(SwapperName.Thorchain))

  const assets = useAppSelector(selectAssets)
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const selectPools = useCallback(
    (midgardPools: MidgardPoolResponse[]) => {
      if (!midgardPools?.length) return []

      return midgardPools
        .reduce<Pool[]>((acc, midgardPool) => {
          const pool = getPool(midgardPool, assets, runeMarketData?.price)
          if (!pool) return acc
          acc.push(pool)
          return acc
        }, [])
        .sort((a, b) => bn(b.runeDepth).comparedTo(a.runeDepth) ?? 0)
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
        if (!runeMarketData?.price) return acc
        acc[thorchainNotationPoolAssetId] = getVolumeStats(data, runeMarketData.price)
        return acc
      }, {}),
    [runeMarketData?.price, swapsData],
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

  const { data: inboundAddressesData, isLoading: isInboundAddressesDataLoading } = useQuery({
    queryKey: inboundAddressDataQueryKey,
    queryFn: inboundAddressDataQueryFn,
    // Go stale instantly
    staleTime: 0,
    // Never store queries in cache since we always want fresh data
    gcTime: 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const { data: mimir } = useThorchainMimir({
    chainId: thorchainChainId,
  })

  const poolsWithActiveData = useMemo(() => {
    const data = (poolsWithVolumeStats.data ?? []).reduce<Pool[]>((acc, pool) => {
      if (!pool) return acc
      const assetId = thorPoolAssetIdToAssetId(pool.asset)
      if (!assetId) return acc

      const inboundAddressesResponse = selectInboundAddressData(
        inboundAddressesData ?? [],
        assetId,
        SwapperName.Thorchain,
      )

      const isTradingActive = selectIsTradingActive({
        assetId,
        inboundAddressResponse: inboundAddressesResponse,
        swapperName: SwapperName.Thorchain,
        mimir,
      })

      // the isTradingActiveLoading below looks odd but is correct
      acc.push({ ...pool, isTradingActive, isTradingActiveLoading: isInboundAddressesDataLoading })
      return acc
    }, [])

    return { ...poolsWithVolumeStats, data }
  }, [inboundAddressesData, isInboundAddressesDataLoading, mimir, poolsWithVolumeStats])

  const poolsWithIsLpDepositEnabled = useMemo(() => {
    if (!mimir) return poolsWithActiveData

    const poolsWithLpDepositEnabled = poolsWithActiveData.data.reduce<Pool[]>((acc, pool) => {
      const assetId = thorPoolAssetIdToAssetId(pool.asset)
      if (!assetId) return acc

      acc.push({
        ...pool,
        isLpChainHalted: isLpChainHalted({ mimir, assetId }),
        isLpDepositEnabled: isLpDepositEnabled({ mimir, assetId }),
        isLpWithdrawEnabled: isLpWithdrawEnabled({ mimir, assetId }),
      })
      return acc
    }, [])

    return { ...poolsWithActiveData, data: poolsWithLpDepositEnabled }
  }, [poolsWithActiveData, mimir])

  return poolsWithIsLpDepositEnabled
}
