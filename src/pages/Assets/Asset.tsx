import { AssetAccountDetails } from '@/components/AssetAccountDetails/AssetAccountDetails'
import { useRouteAssetId } from '@/hooks/useRouteAssetId/useRouteAssetId'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const Asset = () => {
  const assetId = useRouteAssetId()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  if (!asset) return null

  return <AssetAccountDetails assetId={asset.assetId} />
}
