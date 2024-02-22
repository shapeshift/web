import { useTranslate } from 'react-polyglot'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { selectAssetsSortedByName } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const Assets = () => {
  const translate = useTranslate()
  const sortedAssets = useAppSelector(selectAssetsSortedByName)
  return (
    <Main display='flex' flexDir='column' height='calc(100vh - 72px)'>
      <SEO title={translate('navBar.assets')} />
      <AssetSearch assets={sortedAssets} allowWalletUnsupportedAssets />
    </Main>
  )
}
