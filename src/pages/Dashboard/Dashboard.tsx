import { Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { DashboardHeader } from './components/DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
import { Portfolio } from './Portfolio'
import { PortfolioChart } from './PortfolioChart'
import { WalletDashboard } from './WalletDashboard'

export const Dashboard = () => {
  const translate = useTranslate()
  const isDefiDashboardEnabled = useFeatureFlag('DefiDashboard')

  if (isDefiDashboardEnabled)
    return (
      <Main headerComponent={<DashboardHeader />}>
        <SEO title={translate('navBar.dashboard')} />

        <WalletDashboard />
      </Main>
    )

  return (
    <Main>
      <SEO title={translate('navBar.dashboard')} />
      <PortfolioChart />
      <Stack
        alignItems='flex-start'
        spacing={4}
        mx='auto'
        direction={{ base: 'column', xl: 'row' }}
      >
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <Portfolio />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
          <DashboardSidebar />
        </Stack>
      </Stack>
    </Main>
  )
}
