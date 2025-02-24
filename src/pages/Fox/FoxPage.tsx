import { useTranslate } from 'react-polyglot'

import { FoxFarming } from './components/FoxFarming'
import { FoxGovernance } from './components/FoxGovernance'
import { FoxHeader } from './components/FoxHeader'
import { FoxToken } from './components/FoxToken'
import { RFOXSection } from './components/RFOXSection'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'

const headerComponent = <FoxHeader />

export const FoxPage = () => {
  const translate = useTranslate()

  return (
    <>
      <SEO title={translate('navBar.foxEcosystem')} />
      <Main headerComponent={headerComponent} isSubPage>
        <FoxToken />
        <RFOXSection />
        <FoxFarming />
        <FoxGovernance />
      </Main>
    </>
  )
}
