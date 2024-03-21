import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { selectAssetsSortedByMarketCapUserCurrencyBalanceAndName } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

export const Assets = () => {
  const translate = useTranslate()
  const maybeAssets = useAppSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const assets = useMemo(() => maybeAssets ?? [], [maybeAssets])
  return (
    <Main display='flex' flexDir='column' height='calc(100vh - 72px)'>
      <SEO title={translate('navBar.assets')} />
      <AssetSearch assets={assets} allowWalletUnsupportedAssets />
    </Main>
  )
}
