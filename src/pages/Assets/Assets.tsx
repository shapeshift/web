import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { selectAssetsSortedByMarketCapUserCurrencyBalanceAndName } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

import { Markets } from './Markets'

export const Assets = () => {
  const translate = useTranslate()
  const maybeAssets = useAppSelector(selectAssetsSortedByMarketCapUserCurrencyBalanceAndName)
  const assets = useMemo(() => maybeAssets ?? [], [maybeAssets])
  return (
    <Main display='flex' flexDir='column' minHeight='calc(100vh - 72px)' isSubPage>
      <SEO title={translate('navBar.assets')} />
      {/* <AssetSearch assets={assets} allowWalletUnsupportedAssets /> */}
      <Markets />
    </Main>
  )
}
