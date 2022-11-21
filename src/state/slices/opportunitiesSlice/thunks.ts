import type { StartQueryActionCreatorOptions } from '@reduxjs/toolkit/dist/query/core/buildInitiate'
import type { AccountId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { store } from 'state/store'

import { foxEthLpAssetIds, foxEthStakingIds } from '../opportunitiesSlice/constants'
import { opportunitiesApi } from '../opportunitiesSlice/opportunitiesSlice'

export const fetchAllLpOpportunitiesMetadata = async (options?: StartQueryActionCreatorOptions) => {
  const { getOpportunityMetadata } = opportunitiesApi.endpoints

  await Promise.all(
    foxEthLpAssetIds.map(
      async opportunityId =>
        await store.dispatch(
          getOpportunityMetadata.initiate(
            {
              opportunityId,
              opportunityType: DefiType.LiquidityPool,
              defiType: DefiType.LiquidityPool,
              defiProvider: DefiProvider.FoxFarming,
            },
            // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
            { forceRefetch: false, ...options },
          ),
        ),
    ),
  )
}

export const fetchAllStakingOpportunitiesMetadata = async (
  options?: StartQueryActionCreatorOptions,
) => {
  const { getOpportunityMetadata } = opportunitiesApi.endpoints

  await Promise.all([
    opportunitiesApi.endpoints.getOpportunitiesMetadata.initiate({
      defiType: DefiType.Staking,
      defiProvider: DefiProvider.Idle,
      opportunityType: DefiType.Staking,
    }),
    ...foxEthStakingIds.map(
      async opportunityId =>
        await store.dispatch(
          getOpportunityMetadata.initiate(
            {
              opportunityId,
              opportunityType: DefiType.Staking,
              defiType: DefiType.Staking,
              defiProvider: DefiProvider.FoxFarming,
            },
            // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
            { forceRefetch: false, ...options },
          ),
        ),
    ),
  ])
}

export const fetchAllOpportunitiesIds = async (options?: StartQueryActionCreatorOptions) => {
  const { getOpportunityIds } = opportunitiesApi.endpoints

  const queries = [
    {
      defiType: DefiType.Staking,
      defiProvider: DefiProvider.Idle,
    },
    {
      defiType: DefiType.Staking,
      defiProvider: DefiProvider.FoxFarming,
    },
    {
      defiType: DefiType.LiquidityPool,
      defiProvider: DefiProvider.FoxFarming,
    },
  ]

  await Promise.all(queries.map(query => getOpportunityIds.initiate(query, options)))
}

export const fetchAllOpportunitiesMetadata = async (options?: StartQueryActionCreatorOptions) => {
  // Don't Promise.all() me - parallel execution would be better, but the market data of the LP tokens gets populated when fetching LP opportunities
  // Without it, we won't have all we need to populate the staking one - which is relying on the market data of the staked LP token for EVM chains LP token farming
  await fetchAllLpOpportunitiesMetadata(options)
  await fetchAllStakingOpportunitiesMetadata(options)
}

export const fetchAllStakingOpportunitiesUserData = async (
  accountId: AccountId,
  options?: StartQueryActionCreatorOptions,
) => {
  const { getOpportunityUserData } = opportunitiesApi.endpoints

  await Promise.all(
    foxEthStakingIds.map(
      async opportunityId =>
        await store.dispatch(
          getOpportunityUserData.initiate(
            {
              accountId,
              opportunityId,
              opportunityType: DefiType.Staking,
              defiType: DefiType.Staking,
              defiProvider: DefiProvider.FoxFarming,
            },
            // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
            { forceRefetch: false, ...options },
          ),
        ),
    ),
  )
}

export const fetchAllLpOpportunitiesUserdata = async (
  accountId: AccountId,
  options?: StartQueryActionCreatorOptions,
) => {
  const { getOpportunityUserData, getOpportunitiesUserData } = opportunitiesApi.endpoints

  await Promise.all([
    getOpportunitiesUserData.initiate({
      accountId,
      defiType: DefiType.Staking,
      defiProvider: DefiProvider.Idle,
      opportunityType: DefiType.Staking,
    }),
    ...foxEthLpAssetIds.map(
      async opportunityId =>
        await store.dispatch(
          getOpportunityUserData.initiate(
            {
              accountId,
              opportunityId,
              opportunityType: DefiType.LiquidityPool,
              defiType: DefiType.LiquidityPool,
              defiProvider: DefiProvider.FoxFarming,
            },
            // Any previous query without portfolio loaded will be rejected, the first succesful one will be cached
            { forceRefetch: false, ...options },
          ),
        ),
    ),
  ])
}

export const fetchAllOpportunitiesUserData = (
  accountId: AccountId,
  options?: StartQueryActionCreatorOptions,
) =>
  Promise.allSettled([
    fetchAllLpOpportunitiesUserdata(accountId, options),
    fetchAllStakingOpportunitiesUserData(accountId, options),
  ])
