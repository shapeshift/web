import { fromAssetId } from '@shapeshiftoss/caip'
import type { AssetsByIdPartial, MarketData } from '@shapeshiftoss/types'
import { makeAsset } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import { OrderOptionsKeys } from 'components/OrderDropdown/types'
import { SortOptionsKeys } from 'components/SortDropdown/types'
import type { CoingeckoAsset, CoingeckoList } from 'lib/coingecko/types'
import {
  getCoingeckoMarkets,
  getCoingeckoRecentlyAdded,
  getCoingeckoTopMovers,
  getCoingeckoTrending,
} from 'lib/coingecko/utils'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi, marketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssets, selectFeeAssetById } from 'state/slices/selectors'
import type { AppDispatch } from 'state/store'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { MARKETS_CATEGORIES } from '../constants'

const selectCoingeckoAssets = (
  data: CoingeckoAsset[],
  dispatch: AppDispatch,
  assets: AssetsByIdPartial,
) => {
  if (!data) return

  return data.reduce<CoingeckoList>(
    (acc, topMover, i) => {
      const assetId = topMover.assetId
      const chainId = fromAssetId(assetId).chainId
      const feeAsset = selectFeeAssetById(store.getState(), assetId)
      const precision =
        topMover.details.detail_platforms[topMover.details.asset_platform_id]?.decimal_place
      if (!feeAsset) return acc

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

export const useTopMoversQuery = ({
  enabled = true,
  orderBy,
  sortBy,
}: {
  enabled?: boolean
  sortBy?: SortOptionsKeys
  orderBy?: OrderOptionsKeys
}) => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const topMoversQuery = useQuery({
    queryKey: ['coinGeckoTopMovers'],
    queryFn: enabled ? getCoingeckoTopMovers : skipToken,
    staleTime: Infinity,
    select: data => selectCoingeckoAssets(data, dispatch, assets),
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
  orderBy?: OrderOptionsKeys
}) => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const trendingQuery = useQuery({
    queryKey: ['coinGeckoTrending'],
    queryFn: enabled ? getCoingeckoTrending : skipToken,
    staleTime: Infinity,
    select: data => selectCoingeckoAssets(data, dispatch, assets),
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
  orderBy?: OrderOptionsKeys
}) => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const recentlyAddedQuery = useQuery({
    queryKey: ['coinGeckoRecentlyAdded'],
    queryFn: enabled ? getCoingeckoRecentlyAdded : skipToken,
    staleTime: Infinity,
    select: data => selectCoingeckoAssets(data, dispatch, assets),
  })

  return recentlyAddedQuery
}

export const useMarketsQuery = ({
  enabled = true,
  orderBy,
  sortBy,
}: {
  orderBy?: OrderOptionsKeys
  sortBy?: SortOptionsKeys
  enabled?: boolean
}) => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const prefixOrderBy = (() => {
    switch (sortBy) {
      case SortOptionsKeys.PRICE_CHANGE:
        return 'price_change_percentage_24h'
      case SortOptionsKeys.MARKET_CAP:
        return 'market_cap'
      case SortOptionsKeys.VOLUME:
        return 'volume'
      default:
        return 'volume'
    }
  })()

  const sort = (() => {
    switch (orderBy) {
      case OrderOptionsKeys.ASCENDING:
        return 'asc'
      case OrderOptionsKeys.DESCENDING:
        return 'desc'
      default:
        return 'desc'
    }
  })()

  const order = `${prefixOrderBy}_${sort}` as
    | 'market_cap_asc'
    | 'market_cap_desc'
    | 'volume_desc'
    | 'volume_asc'
    | 'price_change_percentage_24h_desc'
    | 'price_change_percentage_24h_asc'

  const recentlyAddedQuery = useQuery({
    queryKey: ['coinGeckoMarkets', order],
    queryFn: enabled ? () => getCoingeckoMarkets(order) : skipToken,
    staleTime: Infinity,
    select: data => selectCoingeckoAssets(data, dispatch, assets),
  })

  return recentlyAddedQuery
}

export const CATEGORY_TO_QUERY_HOOK = {
  [MARKETS_CATEGORIES.TOP_MOVERS]: useTopMoversQuery,
  [MARKETS_CATEGORIES.TRENDING]: useTrendingQuery,
  [MARKETS_CATEGORIES.RECENTLY_ADDED]: useRecentlyAddedQuery,
  [MARKETS_CATEGORIES.MARKET_CAP]: useMarketsQuery,
  [MARKETS_CATEGORIES.TRADING_VOLUME]: useMarketsQuery,
}
