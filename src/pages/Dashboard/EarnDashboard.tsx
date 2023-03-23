import { Main } from 'components/Layout/Main'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'

import { DashboardHeader } from './components/DashboardHeader'

export const EarnDashboard = () => {
  return (
    <Main headerComponent={<DashboardHeader />}>
      <DeFiEarn includeEarnBalances />
    </Main>
  )
}
