import { ASSET_REFERENCE, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { selectStakingOpportunityByFilter } from 'state/slices/opportunitiesSlice/selectors'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import { useAppSelector } from 'state/store'

export const useFoxyQuery = () => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference: contractAddress, assetNamespace } = query
  const contractAssetId = toAssetId({ chainId, assetNamespace, assetReference: contractAddress })
  const opportunityMetadataFilter = useMemo(
    () => ({ stakingId: contractAssetId as StakingId }),
    [contractAssetId],
  )
  const opportunityMetadata = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, opportunityMetadataFilter),
  )

  const underlyingAssetId = opportunityMetadata?.underlyingAssetId ?? ''
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const rewardId = fromAssetId(underlyingAssetId).assetReference

  // The Staking asset is one of the only underlying Asset Ids FOX
  const stakingAssetId = opportunityMetadata?.underlyingAssetIds[0] ?? ''
  const stakingAssetReference = fromAssetId(stakingAssetId).assetReference
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  if (!stakingAsset) throw new Error(`Asset not found for AssetId ${stakingAssetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)
  if (!underlyingAsset) throw new Error(`Asset not found for AssetId ${underlyingAssetId}`)

  return {
    stakingAssetReference,
    feeMarketData,
    contractAddress,
    stakingAsset,
    feeAsset,
    feeAssetId,
    stakingAssetId,
    underlyingAssetId,
    underlyingAsset,
    rewardId,
    chainId,
    contractAssetId,
  }
}
