import type { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const Asset = ({ route }: { route?: Route }) => {
  const assetId = useRouteAssetId()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  if (!asset) return null

  return <AssetAccountDetails assetId={asset.assetId} route={route} />
}
