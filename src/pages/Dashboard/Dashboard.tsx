import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useRouteMatch } from 'react-router'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { NftTable } from 'components/Nfts/NftTable'
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

const direction: StackDirection = { base: 'column', xl: 'row' }
const maxWidth = { base: 'full', lg: 'full', xl: 'sm' }

export const Dashboard = memo(() => {
  const translate = useTranslate()
  const isDefiDashboardEnabled = useFeatureFlag('DefiDashboard')
  const { path } = useRouteMatch()
  const isNftsEnabled = useFeatureFlag('Jaypegz')

  if (isDefiDashboardEnabled)
    return (
      <Main headerComponent={<DashboardHeader />}>
        <SEO title={translate('navBar.dashboard')} />
        <Switch>
          <Route exact path={`${path}`}>
            <WalletDashboard />
          </Route>
          <Route exact path={`${path}/earn`}>
            <EarnDashboard />
          </Route>
          <Route exact path={`${path}/rewards`}>
            <RewardsDashboard />
          </Route>
          <Route path={`${path}/accounts`}>
            <Accounts />
          </Route>
          <Route path={`${path}/activity`}>
            <TransactionHistory />
          </Route>
          {isNftsEnabled && (
            <Route exact path={`${path}/nfts`}>
              <NftTable />
            </Route>
          )}

          <Route>
            <RawText>Not found</RawText>
          </Route>
        </Switch>
      </Main>
    )

  return (
    <Main>
      <SEO title={translate('navBar.dashboard')} />
      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <Portfolio />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={maxWidth} spacing={4}>
          <DashboardSidebar />
        </Stack>
      </Stack>
    </Main>
  )
})
