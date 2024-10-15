import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'

import { FoxFarming } from './components/FoxFarming'
import { FoxGovernance } from './components/FoxGovernance'
import { FoxHeader } from './components/FoxHeader'
import { FoxToken } from './components/FoxToken'
import { RFOXSection } from './components/RFOXSection'
import { FoxPageProvider } from './hooks/useFoxPageContext'

export const FoxPage = () => {
  const translate = useTranslate()
  const headerComponent = useMemo(() => <FoxHeader />, [])

  return (
    <FoxPageProvider>
      <SEO title={translate('navBar.foxBenefits')} />
      <Main headerComponent={headerComponent}>
        <FoxToken />
        <RFOXSection />
        <FoxFarming />
        <FoxGovernance />
      </Main>
    </FoxPageProvider>
  )
}
