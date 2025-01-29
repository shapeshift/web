import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'

import { FoxFarming } from './components/FoxFarming'
import { FoxGovernance } from './components/FoxGovernance'
import { FoxHeader } from './components/FoxHeader'
import { FoxToken } from './components/FoxToken'
import { RFOXSection } from './components/RFOXSection'

const headerComponent = <FoxHeader />

export const FoxPage = () => {
  const translate = useTranslate()

  return (
    <>
      <SEO title={translate('navBar.foxBenefits')} />
      <Main headerComponent={headerComponent} isSubPage>
        <FoxToken />
        <RFOXSection />
        <FoxFarming />
        <FoxGovernance />
      </Main>
    </>
  )
}
