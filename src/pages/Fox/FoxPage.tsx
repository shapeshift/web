import { lazy } from 'react'
import { useTranslate } from 'react-polyglot'

import { RFOXProvider } from '../RFOX/hooks/useRfoxContext'
import { FoxFarming } from './components/FoxFarming'
import { FoxGovernance } from './components/FoxGovernance'
import { FoxHeader } from './components/FoxHeader'
import { FoxToken } from './components/FoxToken'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { FoxPageProvider } from '@/pages/Fox/hooks/useFoxPageContext'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const headerComponent = <FoxHeader />

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const RFOXSection = makeSuspenseful(
  lazy(() =>
    import('./components/RFOXSection').then(({ RFOXSection }) => ({ default: RFOXSection })),
  ),
  defaultBoxSpinnerStyle,
)

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
