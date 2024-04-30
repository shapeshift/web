import { useTranslate } from 'react-polyglot'
import { Display } from 'components/Display'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'
import { useFetchOpportunities } from 'components/StakingVaults/hooks/useFetchOpportunities'

import { EligibleSlider } from '../components/EligibleSlider'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <PageHeader>
      <PageHeader.Left>
        <Display.Mobile>
          <PageBackButton />
        </Display.Mobile>
      </PageHeader.Left>
      <PageHeader.Middle>
        <PageHeader.Title>{translate('defi.earn')}</PageHeader.Title>
      </PageHeader.Middle>
    </PageHeader>
  )
}

const defiHeader = <DefiHeader />

export const StakingVaults = () => {
  const translate = useTranslate()

  useFetchOpportunities()

  return (
    <>
      {defiHeader}
      <Main hideBreadcrumbs isSubPage>
        <SEO title={translate('defi.earn')} description={translate('navBar.defi')} />
        <EligibleSlider />
        <DeFiEarn mt={6} />
      </Main>
    </>
  )
}
