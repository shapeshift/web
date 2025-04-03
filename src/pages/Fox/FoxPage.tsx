import { lazy } from 'react'
import { useTranslate } from 'react-polyglot'

import { FoxFarming } from './components/FoxFarming'
import { FoxGovernance } from './components/FoxGovernance'
import { FoxHeader } from './components/FoxHeader'
import { FoxToken } from './components/FoxToken'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const headerComponent = <FoxHeader />

const RFOXSection = makeSuspenseful(
  lazy(() =>
    import('./components/RFOXSection').then(({ RFOXSection }) => ({ default: RFOXSection })),
  ),
)

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
