import { KKAssetAccountDetails } from 'components/KKAssetAccountDetails/KKAssetAccountDetails'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'

export const KeepkeyAsset = () => {
  const { getKeepkeyAssets } = useKeepKey()
  const assets = getKeepkeyAssets()
  const assetIdUnparsed = useRouteAssetId()
  const assetId = assetIdUnparsed.slice(assetIdUnparsed.indexOf('/') + 1, assetIdUnparsed.length)
  const asset = assets.find(asset => asset.assetId === assetId)
  if (!asset) return null
  return <KKAssetAccountDetails asset={asset} />
}
