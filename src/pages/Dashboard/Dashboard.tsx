import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'

import { DashboardHeader } from './components/DashboardHeader'
import { WalletDashboard } from './WalletDashboard'

export const Dashboard = () => {
  const translate = useTranslate()
  return (
    <Main headerComponent={<DashboardHeader />}>
      <SEO title={translate('navBar.dashboard')} />

      <WalletDashboard />
    </Main>
  )
}
