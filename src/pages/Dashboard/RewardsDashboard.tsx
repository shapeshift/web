import { Main } from 'components/Layout/Main'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'

import { DashboardHeader } from './components/DashboardHeader'

export const RewardsDashboard = () => {
  return (
    <Main headerComponent={<DashboardHeader />}>
      <DeFiEarn includeRewardsBalances />
    </Main>
  )
}
