import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import { isSome } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import { PORTALS_NETWORK_TO_CHAIN_ID } from 'lib/portals/constants'
import { fetchPortalsPlatforms, fetchPortalsTokens, portalTokenToAsset } from 'lib/portals/utils'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssets, selectFeeAssetById } from 'state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'

export const usePortalsAssetsQuery = () => {
  const dispatch = useAppDispatch()
  const assets = useAppSelector(selectAssets)

  const { data: portalsPlatformsData } = useQuery({
    queryKey: ['portalsPlatforms'],
    queryFn: () => fetchPortalsPlatforms(),
  })

  return useQuery({
    queryKey: ['portalsAssets'],
    queryFn: portalsPlatformsData
      ? () =>
          fetchPortalsTokens({
            limit: '10',
            chainIds: undefined,
            sortBy: 'apy',
            sortDirection: 'desc',
          })
      : skipToken,
    select: tokens => {
      if (!portalsPlatformsData) return

      return tokens
        .map(token => {
          const chainId = PORTALS_NETWORK_TO_CHAIN_ID[token.network]
          if (!chainId) return undefined

          const assetId = toAssetId({
            chainId,
            assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
            assetReference: token.address,
          })
          const feeAsset = selectFeeAssetById(store.getState(), assetId)
          if (!feeAsset) return undefined

          const asset = portalTokenToAsset({
            token,
            portalsPlatforms: portalsPlatformsData,
            nativeAsset: feeAsset,
            chainId,
          })

          if (!asset) return undefined

          // upsert fetched asset if doesn't exist in generatedAssetData.json
          if (!assets[assetId]) {
            dispatch(
              assetsSlice.actions.upsertAssets({
                ids: [assetId],
                byId: { [assetId]: asset },
              }),
            )
          }

          return {
            asset,
            // TODO(gomes): do we even need TokenInfo here? Market-data should contain all we need and we shouldn't need to use raw Portals data?
            tokenInfo: token,
          }
        })
        .filter(isSome)
    },
  })
}
