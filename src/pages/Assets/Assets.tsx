import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { selectAssetsByMarketCap } from 'state/slices/selectors'

export const Assets = () => {
  const translate = useTranslate()
  const assetsByMarketCap = useSelector(selectAssetsByMarketCap)
  return (
    <Main display='flex' flexDir='column' height='calc(100vh - 72px)'>
      <SEO title={translate('navBar.assets')} />
      <AssetSearch assets={assetsByMarketCap} />
    </Main>
  )
}
