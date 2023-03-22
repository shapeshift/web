import { Main } from 'components/Layout/Main'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { DashboardHeader } from './components/DashboardHeader'

export const RewardsDashboard = () => {
  return (
    <Main headerComponent={<DashboardHeader />}>
      <DeFiEarn
        positionTableProps={{
          filterBy: opportunities =>
            opportunities.filter(opportunity => bnOrZero(opportunity.fiatRewardsAmount).gt(0)),
        }}
        providerTableProps={{
          filterBy: opportunities =>
            opportunities.filter(opportunity => bnOrZero(opportunity.fiatRewardsAmount).gt(0)),
        }}
      />
    </Main>
  )
}
