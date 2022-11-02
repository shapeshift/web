import type { Asset } from '@shapeshiftoss/asset-service'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'

export const Assets = () => {
  const history = useHistory()
  const translate = useTranslate()
  const onClick = (asset: Asset) => {
    // AssetId has a `/` separator so the router will have to parse 2 variables
    // e.g., /assets/:chainId/:assetSubId
    const url = `/assets/${asset.assetId}`
    history.push(url)
  }
  return (
    <Main display='flex' flexDir='column' height='calc(100vh - 72px)'>
      <SEO title={translate('navBar.assets')} />
      <AssetSearch onClick={onClick} />
    </Main>
  )
}
