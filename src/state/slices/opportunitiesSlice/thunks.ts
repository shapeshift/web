import type { StartQueryActionCreatorOptions } from '@reduxjs/toolkit/dist/query/core/buildInitiate'
import type { AccountId } from '@shapeshiftoss/caip'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { store } from 'state/store'

import { foxEthLpAssetIds, foxEthStakingIds } from '../opportunitiesSlice/constants'
import { opportunitiesApi } from '../opportunitiesSlice/opportunitiesSlice'
import type { LpId } from '../opportunitiesSlice/types'

export const fetchAllLpOpportunitiesMetadata = async (
  queryOptions?: StartQueryActionCreatorOptions,
) => {
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
            // Any previous query without portfolio loaded will be rejected
            // The first successful one will be cached unless forceRefetch is overriden with queryOptions
            { forceRefetch: false, ...queryOptions },
          ),
        ),
    ),
  )
}

export const fetchAllStakingOpportunitiesMetadata = async (
  queryOptions?: StartQueryActionCreatorOptions,
) => {
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
            // Any previous query without portfolio loaded will be rejected
            // The first successful one will be cached unless forceRefetch is overriden with queryOptions
            { forceRefetch: false, ...queryOptions },
          ),
        ),
    ),
  )
}

export const fetchAllOpportunitiesMetadata = async (
  queryOptions?: StartQueryActionCreatorOptions,
) => {
  // Don't Promise.all() me - parallel execution would be better, but the market data of the LP tokens gets populated when fetching LP opportunities
  // Without it, we won't have all we need to populate the staking one - which is relying on the market data of the staked LP token for EVM chains LP token farming
  await fetchAllLpOpportunitiesMetadata(queryOptions)
  await fetchAllStakingOpportunitiesMetadata(queryOptions)
}

export const fetchAllStakingOpportunitiesUserData = async (
  accountId: AccountId,
  queryOptions?: StartQueryActionCreatorOptions,
) => {
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
            // Any previous query without portfolio loaded will be rejected
            // The first successful one will be cached unless forceRefetch is overriden with queryOptions
            { forceRefetch: false, ...queryOptions },
          ),
        ),
    ),
  )
}

export const fetchAllLpOpportunitiesUserdata = async (
  accountId: AccountId,
  queryOptions?: StartQueryActionCreatorOptions,
) => {
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
            // Any previous query without portfolio loaded will be rejected
            // The first successful one will be cached unless forceRefetch is overriden with queryOptions
            { forceRefetch: false, ...queryOptions },
          ),
        ),
    ),
  )
}

export const fetchAllOpportunitiesUserData = (
  accountId: AccountId,
  queryOptions?: StartQueryActionCreatorOptions,
) =>
  Promise.allSettled([
    fetchAllLpOpportunitiesUserdata(accountId, queryOptions),
    fetchAllStakingOpportunitiesUserData(accountId, queryOptions),
  ])
