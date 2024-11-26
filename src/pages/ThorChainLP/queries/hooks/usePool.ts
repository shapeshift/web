import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { sellSupportedChainIds } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import type { MidgardPoolResponse } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import { poolAssetIdToAssetId } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import { useQueries } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import type {
  MidgardInterval,
  MidgardSwapHistoryResponse,
  MidgardTvlHistoryResponse,
} from 'lib/utils/thorchain/lp/types'
import { selectAssets, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type Pool = MidgardPoolResponse & {
  assetId: AssetId
  name: string
  tvlFiat: string
} & Partial<VolumeStats>

export type PoolStats = {
  fees24hFiat: string
  fees24hChange: number
  tvl24hFiat: string
  tvl24hChange: number
  volume24hFiat: string
  volume24hChange: number
  volume7dFiat: string
  volumeTotalFiat: string
}

export type VolumeStats = {
  volume24hFiat: string
  volume24hChange: number
  volume7dFiat: string
}

export type PoolWithStats = Pool & PoolStats

export const getPool = (
  pool: MidgardPoolResponse,
  assets: AssetsByIdPartial,
  runePrice: string,
): Pool | undefined => {
  if (!pool) return

  const runeAsset = assets[thorchainAssetId]
  if (!runeAsset) return

  const assetId = poolAssetIdToAssetId(pool.asset)
  if (!assetId) return

  const chainId = fromAssetId(assetId).chainId
  if (!sellSupportedChainIds[chainId]) return

  const asset = assets[assetId]
  if (!asset) return

  const tvl = bn(pool.assetDepth).times(pool.assetPrice).plus(pool.runeDepth)

  return {
    ...pool,
    assetId,
    name: `${asset.symbol}/${runeAsset.symbol}`,
    tvlFiat: fromThorBaseUnit(tvl).times(runePrice).toFixed(),
  }
}

// selectSwapsData aggregates fees and volume (128 hour intervals -> 7 day intervals)
export const selectSwapsData = (
  data: MidgardSwapHistoryResponse,
  thorchainNotationPoolAssetId: string,
) => {
  let historyIndex = 0
  const intervals = data.intervals.reduce<Pick<MidgardInterval, 'totalFees' | 'totalVolume'>[]>(
    (prev, interval, i) => {
      if (i !== 0 && i % 24 === 0) historyIndex++

      if (!prev[historyIndex]) {
        prev[historyIndex] = {
          totalFees: interval.totalFees,
          totalVolume: interval.totalVolume,
        }
      } else {
        prev[historyIndex].totalFees = bn(prev[historyIndex].totalFees)
          .plus(interval.totalFees)
          .toFixed()
        prev[historyIndex].totalVolume = bn(prev[historyIndex].totalVolume)
          .plus(interval.totalVolume)
          .toFixed()
      }

      return prev
    },
    [],
  )

  return {
    intervals,
    meta: data.meta,
    thorchainNotationPoolAssetId,
  }
}

export const getFeeStats = (swapsData: ReturnType<typeof selectSwapsData>, runePrice: string) => {
  const swaps24h = swapsData.intervals[swapsData.intervals.length - 1]
  const swapsPrev24h = swapsData.intervals[swapsData.intervals.length - 2]

  const fees24hFiat = fromThorBaseUnit(swaps24h.totalFees).times(runePrice).toFixed()
  const fees24hChange = bnOrZero(swaps24h.totalFees)
    .minus(bnOrZero(swapsPrev24h.totalFees))
    .div(swapsPrev24h.totalFees)
    .toNumber()

  return {
    fees24hFiat,
    fees24hChange,
  }
}

export const getTvlStats = (pool: Pool, tvl24hIntervals: string[], runePrice: string) => {
  const tvl24h = bn(pool.assetDepth).times(pool.assetPrice).plus(pool.runeDepth)
  const tvlPrev24h = tvl24hIntervals[tvl24hIntervals.length - 2]

  const tvl24hFiat = fromThorBaseUnit(tvl24h).times(runePrice).toFixed()
  const tvl24hChange = bnOrZero(tvl24h).minus(bnOrZero(tvlPrev24h)).div(tvlPrev24h).toNumber()

  return {
    tvl24hFiat,
    tvl24hChange,
  }
}

export const getVolumeStats = (
  swapsData: ReturnType<typeof selectSwapsData>,
  runePrice: string,
): VolumeStats => {
  const swaps24h = swapsData.intervals[swapsData.intervals.length - 1]
  const swapsPrev24h = swapsData.intervals[swapsData.intervals.length - 2]

  const volume24hFiat = fromThorBaseUnit(swaps24h.totalVolume).times(runePrice).toFixed()
  const volume24hChange = bnOrZero(swaps24h.totalVolume)
    .minus(bnOrZero(swapsPrev24h.totalVolume))
    .div(swapsPrev24h.totalVolume)
    .toNumber()

  const volume7dFiat = fromThorBaseUnit(swapsData.meta.totalVolume).times(runePrice).toFixed()

  return {
    volume24hFiat,
    volume24hChange,
    volume7dFiat,
  }
}

export const usePool = (poolAssetId: string) => {
  const assets = useAppSelector(selectAssets)
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )
  const { midgard } = reactQueries

  const selectPoolData = useCallback(
    (pool: MidgardPoolResponse) => getPool(pool, assets, runeMarketData.price),
    [assets, runeMarketData],
  )

  // selectTvl changes 128 hour intervals -> 7 day intervals and keys by poolAssetId
  const selectTvl = useCallback(
    (data: MidgardTvlHistoryResponse) => {
      const tvlByPool = data.intervals.reduce<Record<string, string[]>>((acc, interval) => {
        interval.poolsDepth.forEach(v => {
          if (!acc[v.pool]) acc[v.pool] = []
          acc[v.pool].push(v.totalDepth)
        })
        return acc
      }, {})

      return tvlByPool[poolAssetId].reduce<string[]>((prev, tvl, i) => {
        if (i % 24 === 0) prev.push(tvl)
        return prev
      }, [])
    },
    [poolAssetId],
  )

  const [poolData, swapsData, tvl, poolStats] = useQueries({
    queries: [
      { ...midgard.poolData(poolAssetId), select: selectPoolData },
      {
        ...midgard.swapsData(poolAssetId, 'hour', 7 * 24),
        select: (swapsData: MidgardSwapHistoryResponse) => selectSwapsData(swapsData, poolAssetId),
      },
      { ...midgard.tvl('hour', 7 * 24), select: selectTvl },
      { ...midgard.poolStats(poolAssetId, 'all') },
    ],
  })

  const isLoading = useMemo(
    () => poolData.isLoading || swapsData.isLoading || tvl.isLoading || poolStats.isLoading,
    [poolData.isLoading, swapsData.isLoading, tvl.isLoading, poolStats.isLoading],
  )

  const feeStats = useMemo(() => {
    if (!swapsData.data) return
    if (!runeMarketData.price) return
    return getFeeStats(swapsData.data, runeMarketData.price)
  }, [swapsData.data, runeMarketData.price])

  const tvlStats = useMemo(() => {
    if (!poolData.data) return
    if (!tvl.data) return
    if (!runeMarketData.price) return
    return getTvlStats(poolData.data, tvl.data, runeMarketData.price)
  }, [poolData.data, tvl.data, runeMarketData.price])

  const volumeStats = useMemo(() => {
    if (!poolStats.data) return
    if (!swapsData.data) return
    if (!runeMarketData.price) return

    const volumeTotalFiat = fromThorBaseUnit(poolStats.data.swapVolume ?? '0')
      .times(runeMarketData.price)
      .toFixed()

    return {
      ...getVolumeStats(swapsData.data, runeMarketData.price),
      volumeTotalFiat,
    }
  }, [poolStats.data, swapsData.data, runeMarketData.price])

  const poolWithStats: PoolWithStats | undefined = useMemo(() => {
    if (!(poolData.data && tvlStats && feeStats && volumeStats)) return

    return {
      ...poolData.data,
      ...feeStats,
      ...tvlStats,
      ...volumeStats,
    }
  }, [poolData.data, tvlStats, feeStats, volumeStats])

  return {
    data: poolWithStats,
    isLoading,
  }
}
