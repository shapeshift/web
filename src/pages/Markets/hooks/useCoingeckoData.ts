import { fromAssetId } from '@shapeshiftoss/caip'
import type { AssetsByIdPartial, MarketData } from '@shapeshiftoss/types'
import { makeAsset } from '@shapeshiftoss/utils'
import { useQuery } from '@tanstack/react-query'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import type { CoingeckoAsset, CoingeckoList } from 'lib/coingecko/utils'
import {
  getCoingeckoRecentlyAdded,
  getCoingeckoTopMovers,
  getCoingeckoTrending,
} from 'lib/coingecko/utils'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi, marketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssets, selectFeeAssetById } from 'state/slices/selectors'
import type { AppDispatch } from 'state/store'
import { store, useAppDispatch, useAppSelector } from 'state/store'

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
        if (i === 0)
          dispatch(
            marketApi.endpoints.findPriceHistoryByAssetId.initiate({
              assetId,
              timeframe: DEFAULT_HISTORY_TIMEFRAME,
            }),
          )
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

export const useTopMoversQuery = () => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const topMoversQuery = useQuery({
    queryKey: ['coinGeckoTopMovers'],
    queryFn: getCoingeckoTopMovers,
    staleTime: Infinity,
    select: data => selectCoingeckoAssets(data, dispatch, assets),
  })

  return topMoversQuery
}

export const useTrendingQuery = () => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const trendingQuery = useQuery({
    queryKey: ['coinGeckoTrending'],
    queryFn: getCoingeckoTrending,
    staleTime: Infinity,
    select: data => selectCoingeckoAssets(data, dispatch, assets),
  })

  return trendingQuery
}

export const useRecentlyAddedQuery = () => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const recentlyAddedQuery = useQuery({
    queryKey: ['coinGeckoRecentlyAdded'],
    queryFn: getCoingeckoRecentlyAdded,
    staleTime: Infinity,
    select: data => selectCoingeckoAssets(data, dispatch, assets),
  })

  return recentlyAddedQuery
}
