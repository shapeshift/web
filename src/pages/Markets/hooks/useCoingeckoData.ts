import { fromAssetId } from '@shapeshiftoss/caip'
import { makeAsset } from '@shapeshiftoss/utils'
import { useQuery } from '@tanstack/react-query'
import { getCoingeckoMovers } from 'lib/coingecko/utils'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
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

      // TODO(gomes): types
      return topMovers.reduce<any>(
        (acc, topMover) => {
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

            // and its market-data since it may or may not be missing
            dispatch(marketApi.endpoints.findByAssetId.initiate(assetId))
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
