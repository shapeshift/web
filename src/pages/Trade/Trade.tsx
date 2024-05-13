import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { MultiHopTrade } from 'components/MultiHopTrade/MultiHopTrade'

const pageProps = {
  pb: 0,
}

export const Trade = memo(() => {
  const translate = useTranslate()
  return (
    <>
      <Main
        px={0}
        pb={0}
        pt={0}
        display='flex'
        flex={1}
        width='full'
        hideBreadcrumbs
        isSubPage
        pageProps={pageProps}
      >
        <SEO title={translate('navBar.trade')} />
        <MultiHopTrade />
      </Main>
    </>
  )
})
