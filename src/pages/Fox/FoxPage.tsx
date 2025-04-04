import { useTranslate } from 'react-polyglot'

import { RFOXProvider } from '../RFOX/hooks/useRfoxContext'
import { FoxFarming } from './components/FoxFarming'
import { FoxGovernance } from './components/FoxGovernance'
import { FoxHeader } from './components/FoxHeader'
import { FoxToken } from './components/FoxToken'
import { RFOXSection } from './components/RFOXSection'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { FoxPageProvider } from '@/pages/Fox/hooks/useFoxPageContext'

const headerComponent = <FoxHeader />

export const FoxPage = () => {
  const translate = useTranslate()

  return (
    <FoxPageProvider>
      <SEO title={translate('navBar.foxEcosystem')} />
      <Main headerComponent={headerComponent} isSubPage>
        <FoxToken />
        <RFOXProvider>
          <RFOXSection />
        </RFOXProvider>
        <FoxFarming />
        <FoxGovernance />
      </Main>
    </FoxPageProvider>
  )
}
