import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'

import { MarketsHeader } from './MarketsHeader'

export const Recommended = () => {
  const translate = useTranslate()

  const headerComponent = useMemo(() => <MarketsHeader />, [])

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('navBar.markets')} />
    </Main>
  )
}
