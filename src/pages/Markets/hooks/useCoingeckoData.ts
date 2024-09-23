import { fromAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { makeAsset } from '@shapeshiftoss/utils'
import { useQuery } from '@tanstack/react-query'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import { getCoingeckoMovers } from 'lib/coingecko/utils'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi, marketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssets, selectFeeAssetById } from 'state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'

export const useTopMoversQuery = () => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const topMoversQuery = useQuery({
    queryKey: ['coinGeckoTopMovers'],
    queryFn: getCoingeckoMovers,
    staleTime: Infinity,
    select: topMovers => {
      if (!topMovers) return

      return topMovers.reduce<any>(
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

          // TODO(gomes): all this bit of logic is duplicated from Portals and will be re-duplicated for other cg categories... consolidate me.
          if (!asset) return acc

          // upsert fetched asset if doesn't exist in generatedAssetData.json
          if (!assets[assetId]) {
            dispatch(
              assetsSlice.actions.upsertAssets({
                ids: [assetId],
                byId: { [assetId]: asset },
              }),
            )

            // The /coins/<coin> endpoint already returns us the current market data so no need to refetch it, we can directly upsert
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
    },
  })

  return topMoversQuery
}
