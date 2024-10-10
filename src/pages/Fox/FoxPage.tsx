import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'

import { FoxHeader } from './components/FoxHeader'
import { FoxToken } from './components/FoxToken'
import { FoxPageProvider } from './hooks/useFoxPageContext'

export const FoxPage = () => {
  const translate = useTranslate()
  const headerComponent = useMemo(() => <FoxHeader />, [])

  return (
    <FoxPageProvider>
      <SEO title={translate('navBar.foxBenefits')} />
      <Main headerComponent={headerComponent}>
        <FoxToken />
      </Main>
    </FoxPageProvider>
  )
}
