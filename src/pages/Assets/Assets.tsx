import type { Asset } from '@keepkey/asset-service'
import { useHistory } from 'react-router-dom'
import { AssetSearchKK } from 'components/AssetSearchKK/AssetSearchKK'
import { Main } from 'components/Layout/Main'

export const Assets = () => {
  const history = useHistory()
  const onClick = (asset: Asset) => {
    const isKeepkeyAsset = asset.assetId.startsWith('keepkey')

    const routeAssetId = isKeepkeyAsset ? `${asset.chainId}/${asset.assetId}` : asset.assetId

    // AssetId has a `/` separator so the router will have to parse 2 variables
    // e.g., /assets/:chainId/:assetSubId
    const url = !isKeepkeyAsset ? `/assets/${routeAssetId}` : `/assets/keepkey/${routeAssetId}`
    history.push({ pathname: url })
  }
  return (
    <Main display='flex' flexDir='column' height='calc(100vh - 72px)'>
      <AssetSearchKK onClick={onClick} />
    </Main>
  )
}
