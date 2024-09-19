import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
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

export const usePortalsAssetsQuery = ({ chainIds }: { chainIds: ChainId[] | undefined }) => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const { data: portalsPlatformsData } = useQuery({
    queryKey: ['portalsPlatforms'],
    queryFn: () => fetchPortalsPlatforms(),
  })

  return useQuery({
    queryKey: ['portalsAssets', { chainIds }],
    queryFn: portalsPlatformsData
      ? () =>
          fetchPortalsTokens({
            limit: 10,
            chainIds,
            sortBy: 'apy',
            sortDirection: 'desc',
          })
      : skipToken,
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

            // and its market-data since it may or may not be missing
            dispatch(marketApi.endpoints.findByAssetId.initiate(assetId))
          }

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
