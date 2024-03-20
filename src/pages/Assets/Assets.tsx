import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { TradeAssetSearch } from 'components/TradeAssetSearch/TradeAssetSearch'

export const Assets = () => {
  const translate = useTranslate()
  return (
    <Main display='flex' flexDir='column' height='calc(100vh - 72px)'>
      <SEO title={translate('navBar.assets')} />
      <TradeAssetSearch />
    </Main>
  )
}
