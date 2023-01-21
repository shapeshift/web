import { ASSET_REFERENCE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { selectStakingOpportunitiesById } from 'state/slices/opportunitiesSlice/selectors'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import { useAppSelector } from 'state/store'

export const useFoxyDeposit = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference: contractAddress, assetNamespace } = query
  const contractAssetId = toAssetId({ chainId, assetNamespace, assetReference: contractAddress })
  const opportunitiesMetadata = useAppSelector(state => selectStakingOpportunitiesById(state))

  const opportunityMetadata = useMemo(
    () => opportunitiesMetadata[contractAssetId as StakingId],
    [contractAssetId, opportunitiesMetadata],
  )

  // The Staking asset is one of the only underlying Asset Ids FOX
  const assetId = opportunityMetadata?.underlyingAssetIds[0] ?? ''
  const assetReference = fromAssetId(assetId).assetReference
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  return { assetReference, feeMarketData, contractAddress, asset, feeAsset }
}
