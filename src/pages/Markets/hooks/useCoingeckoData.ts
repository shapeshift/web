import { fromAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { bnOrZero, makeAsset } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'

import { marketDataBySortKey, MarketsCategories } from '../constants'

import { OrderDirection } from '@/components/OrderDropdown/types'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { DEFAULT_HISTORY_TIMEFRAME } from '@/constants/Config'
import type { CoingeckoAsset, CoingeckoList } from '@/lib/coingecko/types'
import {
  getCoingeckoMarkets,
  getCoingeckoRecentlyAdded,
  getCoingeckoTopMovers,
  getCoingeckoTrending,
} from '@/lib/coingecko/utils'
import type { CoinGeckoSortKey } from '@/lib/market-service/coingecko/coingecko'
import { assets as assetsSlice } from '@/state/slices/assetsSlice/assetsSlice'
import { marketApi, marketData } from '@/state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssets,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import type { AppDispatch } from '@/state/store'
import { store, useAppDispatch } from '@/state/store'

const selectCoingeckoAssets = (data: CoingeckoAsset[], dispatch: AppDispatch) => {
  if (!data) return

  // Get fresh assets from store to avoid stale closures in react-query select callbacks
  const assets = selectAssets(store.getState())

  // Debug: log assets state
  const assetCount = Object.keys(assets).length
  console.log('[selectCoingeckoAssets] Assets count:', assetCount, 'Data length:', data.length)

  return data.reduce<CoingeckoList>(
    (acc, topMover, i) => {
      const assetId = topMover.assetId
      const chainId = fromAssetId(assetId).chainId
      const feeAsset = selectFeeAssetById(store.getState(), assetId)

      // Handle optional details - if we don't have details, we already have the asset
      if (!topMover.details) {
        // Asset already exists in store, just add to results
        if (!acc.chainIds.includes(chainId)) {
          acc.chainIds.push(chainId)
        }
        acc.byId[assetId] = topMover
        acc.ids.push(assetId)
        return acc
      }

      const precision =
        topMover.details.detail_platforms[topMover.details.asset_platform_id]?.decimal_place
      if (!feeAsset) {
        console.warn('[selectCoingeckoAssets] Filtering out asset - no feeAsset:', assetId)
        return acc
      }

      const asset = makeAsset(assets, {
        assetId,
        symbol: topMover.details.symbol,
        name: topMover.details.name,
        precision,
        icon: topMover.details.image.small,
      })

      if (!asset) return acc

      // upsert fetched asset if doesn't exist in generatedAssetData.json
      if (!assets[assetId]) {
        dispatch(
          assetsSlice.actions.upsertAssets({
            ids: [assetId],
            byId: { [assetId]: asset },
          }),
        )

        const currentMarketData: MarketData = {
          price: topMover.details.market_data.current_price.usd.toString(),
          marketCap: topMover.details.market_data.market_cap.toString(),
          volume: (topMover.details.market_data.total_volume ?? 0).toString(),
          changePercent24Hr: topMover.details.market_data.price_change_percentage_24h,
          supply: topMover.details.market_data.circulating_supply.toString(),
          maxSupply:
            topMover.details.market_data.max_supply?.toString() ??
            topMover.details.market_data.total_supply?.toString(),
        }

        dispatch(marketData.actions.setCryptoMarketData({ [assetId]: currentMarketData }))

        // We only need price history for the 0th item (big card with chart)
        if (i === 0) {
          dispatch(
            marketApi.endpoints.findPriceHistoryByAssetId.initiate({
              assetId,
              timeframe: DEFAULT_HISTORY_TIMEFRAME,
            }),
          )
        }
      }

      if (!acc.chainIds.includes(chainId)) {
        acc.chainIds.push(chainId)
      }

      acc.byId[assetId] = topMover
      acc.ids.push(assetId)
      return acc
    },
    {
      byId: {},
      ids: [],
      chainIds: [],
    },
  )
}

export const selectCoingeckoAssetIdsSortedAndOrdered = (
  data: CoingeckoAsset[],
  dispatch: AppDispatch,
  sortBy?: SortOptionsKeys,
  orderBy?: OrderDirection,
) => {
  const coingeckoAssets = selectCoingeckoAssets(data, dispatch)

  if (!coingeckoAssets) return coingeckoAssets
  if (!sortBy) return coingeckoAssets
  if (!orderBy) return coingeckoAssets

  const dataKey = marketDataBySortKey[sortBy]

  if (dataKey === 'apy') return coingeckoAssets

  return {
    ...coingeckoAssets,
    ids: coingeckoAssets.ids.sort((a, b) => {
      const firstAssetId = orderBy === OrderDirection.Ascending ? a : b
      const secondAssetId = orderBy === OrderDirection.Ascending ? b : a
      const state = store.getState()

      const assetAMarketData = selectMarketDataByAssetIdUserCurrency(state, firstAssetId)
      const assetBMarketData = selectMarketDataByAssetIdUserCurrency(state, secondAssetId)

      return (
        bnOrZero(assetAMarketData?.[dataKey] ?? 0).toNumber() -
        bnOrZero(assetBMarketData?.[dataKey] ?? 0).toNumber()
      )
    }),
  }
}

export const useTopMoversQuery = ({
  enabled = true,
  orderBy,
  sortBy,
}: {
  enabled?: boolean
  sortBy?: SortOptionsKeys
  orderBy?: OrderDirection
}) => {
  const dispatch = useAppDispatch()

  const topMoversQuery = useQuery({
    queryKey: ['coinGeckoTopMovers', orderBy, sortBy],
    queryFn: enabled ? getCoingeckoTopMovers : skipToken,
    staleTime: Infinity,
    select: data => {
      return enabled
        ? selectCoingeckoAssetIdsSortedAndOrdered(data, dispatch, sortBy, orderBy)
        : undefined
    },
  })

  return topMoversQuery
}

export const useTrendingQuery = ({
  enabled = true,
  orderBy,
  sortBy,
}: {
  enabled?: boolean
  sortBy?: SortOptionsKeys
  orderBy?: OrderDirection
}) => {
  const dispatch = useAppDispatch()

  const trendingQuery = useQuery({
    queryKey: ['coinGeckoTrending', orderBy, sortBy],
    queryFn: enabled ? getCoingeckoTrending : skipToken,
    staleTime: Infinity,
    select: data => {
      return enabled
        ? selectCoingeckoAssetIdsSortedAndOrdered(data, dispatch, sortBy, orderBy)
        : undefined
    },
  })

  return trendingQuery
}

export const useRecentlyAddedQuery = ({
  enabled = true,
  orderBy,
  sortBy,
}: {
  enabled?: boolean
  sortBy?: SortOptionsKeys
  orderBy?: OrderDirection
}) => {
  const dispatch = useAppDispatch()

  const recentlyAddedQuery = useQuery({
    queryKey: ['coinGeckoRecentlyAdded', orderBy, sortBy],
    queryFn: enabled ? getCoingeckoRecentlyAdded : skipToken,
    staleTime: Infinity,
    select: data => {
      return enabled
        ? selectCoingeckoAssetIdsSortedAndOrdered(data, dispatch, sortBy, orderBy)
        : undefined
    },
  })

  return recentlyAddedQuery
}

export const useMarketsQuery = ({
  enabled = true,
  orderBy,
  sortBy,
  page,
  limit,
}: {
  orderBy?: OrderDirection
  sortBy?: SortOptionsKeys
  enabled?: boolean
  page?: number
  limit?: number
}) => {
  const dispatch = useAppDispatch()

  const prefixOrderBy = (() => {
    switch (sortBy) {
      case SortOptionsKeys.MarketCap:
        return 'market_cap'
      case SortOptionsKeys.Volume:
        return 'volume'
      default:
        return 'volume'
    }
  })()

  const sort = (() => {
    switch (orderBy) {
      case OrderDirection.Ascending:
        return 'asc'
      case OrderDirection.Descending:
        return 'desc'
      default:
        return 'desc'
    }
  })()

  const order: CoinGeckoSortKey = `${prefixOrderBy}_${sort}`

  const recentlyAddedQuery = useQuery({
    queryKey: ['coinGeckoMarkets', order, page, limit],
    queryFn: enabled ? () => getCoingeckoMarkets(order, page, limit) : skipToken,
    staleTime: Infinity,
    select: data => {
      return enabled ? selectCoingeckoAssets(data, dispatch) : undefined
    },
  })

  return recentlyAddedQuery
}

export const CATEGORY_TO_QUERY_HOOK = {
  [MarketsCategories.TopMovers]: useTopMoversQuery,
  [MarketsCategories.Trending]: useTrendingQuery,
  [MarketsCategories.RecentlyAdded]: useRecentlyAddedQuery,
  [MarketsCategories.MarketCap]: useMarketsQuery,
  [MarketsCategories.TradingVolume]: useMarketsQuery,
}
