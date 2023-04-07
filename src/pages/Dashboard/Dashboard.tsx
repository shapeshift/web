import { Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch } from 'react-router'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { RawText } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { Accounts } from 'pages/Accounts/Accounts'
import { TransactionHistory } from 'pages/TransactionHistory/TransactionHistory'

import { DashboardHeader } from './components/DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
import { EarnDashboard } from './EarnDashboard'
import { Portfolio } from './Portfolio'
import { RewardsDashboard } from './RewardsDashboard'
import { WalletDashboard } from './WalletDashboard'

export const Dashboard = () => {
  const translate = useTranslate()
  const isDefiDashboardEnabled = useFeatureFlag('DefiDashboard')

  if (isDefiDashboardEnabled)
    return (
      <Main headerComponent={<DashboardHeader />}>
        <SEO title={translate('navBar.dashboard')} />
        <Switch>
          <Route exact path='/dashboard'>
            <WalletDashboard />
          </Route>
          <Route exact path='/dashboard/earn'>
            <EarnDashboard />
          </Route>
          <Route exact path='/dashboard/rewards'>
            <RewardsDashboard />
          </Route>
          <Route path='/dashboard/accounts'>
            <Accounts />
          </Route>
          <Route exact path='/dashboard/activity'>
            <TransactionHistory />
          </Route>
          <Route>
            <RawText>Not found</RawText>
          </Route>
        </Switch>
      </Main>
    )

  return (
    <Main>
      <SEO title={translate('navBar.dashboard')} />
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
