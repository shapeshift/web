import type { AccountId } from '@shapeshiftoss/caip'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { store } from 'state/store'

import { foxEthLpAssetIds, foxEthStakingIds } from '../opportunitiesSlice/constants'
import { opportunitiesApi } from '../opportunitiesSlice/opportunitiesSlice'
import type { LpId } from '../opportunitiesSlice/types'

export const fetchAllLpOpportunitiesMetadata = async () => {
  const { getOpportunityMetadata } = opportunitiesApi.endpoints

  await Promise.all(
    foxEthLpAssetIds.map(
      async opportunityId =>
        await store.dispatch(
          getOpportunityMetadata.initiate(
            {
              opportunityId: opportunityId as LpId,
              opportunityType: DefiType.LiquidityPool,
              defiType: DefiType.LiquidityPool,
            },
            // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
            { forceRefetch: false },
          ),
        ),
    ),
  )
}

export const fetchAllStakingOpportunitiesMetadata = async () => {
  const { getOpportunityMetadata } = opportunitiesApi.endpoints

  await Promise.all(
    foxEthStakingIds.map(
      async opportunityId =>
        await store.dispatch(
          getOpportunityMetadata.initiate(
            {
              opportunityId: opportunityId as LpId,
              opportunityType: DefiType.Staking,
              defiType: DefiType.Staking,
            },
            // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
            { forceRefetch: false },
          ),
        ),
    ),
  )
}

export const fetchAllOpportunitiesMetadata = async () => {
  // Don't Promise.all() me - parallel execution would be better, but the market data of the LP tokens gets populated when fetching LP opportunities
  // Without it, we won't have all we need to populate the staking one - which is relying on the market data of the staked LP token for EVM chains LP token farming
  await fetchAllLpOpportunitiesMetadata()
  await fetchAllStakingOpportunitiesMetadata()
}

export const fetchAllStakingOpportunitiesUserData = async (accountId: AccountId) => {
  const { getOpportunityUserData } = opportunitiesApi.endpoints

  await Promise.all(
    foxEthStakingIds.map(
      async opportunityId =>
        await store.dispatch(
          getOpportunityUserData.initiate(
            {
              accountId,
              opportunityId: opportunityId as LpId,
              opportunityType: DefiType.Staking,
              defiType: DefiType.Staking,
            },
            // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
            { forceRefetch: false },
          ),
        ),
    ),
  )
}

export const fetchAllLpOpportunitiesUserdata = async (accountId: AccountId) => {
  const { getOpportunityUserData } = opportunitiesApi.endpoints

  await Promise.all(
    foxEthLpAssetIds.map(
      async opportunityId =>
        await store.dispatch(
          getOpportunityUserData.initiate(
            {
              accountId,
              opportunityId: opportunityId as LpId,
              opportunityType: DefiType.LiquidityPool,
              defiType: DefiType.LiquidityPool,
            },
            // Any previous query without portfolio loaded will be rejected, the first succesful one will be cached
            { forceRefetch: false },
          ),
        ),
    ),
  )
}

export const fetchAllOpportunitiesUserData = async (accountId: AccountId) =>
  await Promise.allSettled([
    fetchAllLpOpportunitiesUserdata(accountId),
    fetchAllStakingOpportunitiesUserData(accountId),
  ])
