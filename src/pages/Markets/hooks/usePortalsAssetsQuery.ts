import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import { OrderOptionsKeys } from 'components/OrderDropdown/types'
import { SortOptionsKeys } from 'components/SortDropdown/types'
import { PORTALS_NETWORK_TO_CHAIN_ID } from 'lib/portals/constants'
import type { TokenInfo } from 'lib/portals/types'
import { fetchPortalsPlatforms, fetchPortalsTokens, portalTokenToAsset } from 'lib/portals/utils'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssets, selectFeeAssetById } from 'state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'

export type PortalsAssets = {
  byId: Record<AssetId, TokenInfo>
  ids: AssetId[]
  chainIds: ChainId[]
}

export const usePortalsAssetsQuery = ({
  enabled,
  chainIds,
  sortBy,
  orderBy,
}: {
  enabled: boolean
  chainIds: ChainId[] | undefined
  sortBy?: SortOptionsKeys
  orderBy?: OrderOptionsKeys
}) => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const { data: portalsPlatformsData } = useQuery({
    queryKey: ['portalsPlatforms'],
    queryFn: enabled ? () => fetchPortalsPlatforms() : skipToken,
    staleTime: Infinity,
  })

  return useQuery({
    queryKey: ['portalsAssets', { chainIds, orderBy, sortBy }],
    queryFn:
      enabled && portalsPlatformsData
        ? () =>
            fetchPortalsTokens({
              limit: 10,
              chainIds,
              sortBy: sortBy === SortOptionsKeys.VOLUME ? 'volumeUsd1d' : 'apy',
              sortDirection:
                orderBy === OrderOptionsKeys.ASCENDING && sortBy !== SortOptionsKeys.MARKET_CAP
                  ? 'asc'
                  : 'desc',
            })
        : skipToken,
    gcTime: 60 * 1000 * 5,
    staleTime: 60 * 1000 * 5,
    select: tokens => {
      if (!portalsPlatformsData) return

      return tokens.reduce<PortalsAssets>(
        (acc, token) => {
          const chainId = PORTALS_NETWORK_TO_CHAIN_ID[token.network]
          if (!chainId) return acc

          const assetId = toAssetId({
            chainId,
            assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
            assetReference: token.address,
          })
          const feeAsset = selectFeeAssetById(store.getState(), assetId)
          if (!feeAsset) return acc

          const asset = portalTokenToAsset({
            token,
            portalsPlatforms: portalsPlatformsData,
            nativeAsset: feeAsset,
            chainId,
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
          }

          // and fetch its market-data since it may or may not be missing
          dispatch(marketApi.endpoints.findByAssetId.initiate(assetId))

          if (!acc.chainIds.includes(chainId)) {
            acc.chainIds.push(chainId)
          }

          acc.byId[assetId] = token
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
}
