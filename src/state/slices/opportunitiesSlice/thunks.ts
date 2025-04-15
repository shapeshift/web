import type { StartQueryActionCreatorOptions } from '@reduxjs/toolkit/query/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'

import { foxEthStakingIds, rFOXStakingIds } from '../opportunitiesSlice/constants'
import { CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES } from './mappings'
import { opportunitiesApi } from './opportunitiesApiSlice'
import { DefiProvider, DefiType } from './types'

import { assertIsKnownChainId } from '@/lib/utils'
import type { AppDispatch } from '@/state/store'

export const fetchAllStakingOpportunitiesMetadataByChainId = async (
  dispatch: AppDispatch,
  chainId: ChainId,
  options?: StartQueryActionCreatorOptions,
) => {
  const { getOpportunitiesMetadata, getOpportunityMetadata } = opportunitiesApi.endpoints

  assertIsKnownChainId(chainId)
  const stakingQueries = CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES[chainId].filter(
    query => query.defiType === DefiType.Staking,
  )
  const ethFoxStakingQueries = foxEthStakingIds.map(opportunityId => {
    return {
      opportunityId,
      defiType: DefiType.Staking,
      defiProvider: DefiProvider.EthFoxStaking,
    }
  })

  const rFOXStakingQueries = rFOXStakingIds.map(opportunityId => {
    return {
      opportunityId,
      defiType: DefiType.Staking,
      defiProvider: DefiProvider.rFOX,
    }
  })

  await Promise.allSettled([
    dispatch(
      getOpportunitiesMetadata.initiate(
        stakingQueries,
        // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
        { forceRefetch: false, ...options },
      ),
    ),
    dispatch(
      getOpportunityMetadata.initiate(ethFoxStakingQueries, { forceRefetch: true, ...options }),
    ),
    dispatch(
      getOpportunityMetadata.initiate(rFOXStakingQueries, { forceRefetch: true, ...options }),
    ),
  ])
}

export const fetchAllOpportunitiesIdsByChainId = async (
  dispatch: AppDispatch,
  chainId: ChainId,
  options?: StartQueryActionCreatorOptions,
) => {
  const { getOpportunityIds } = opportunitiesApi.endpoints

  assertIsKnownChainId(chainId)
  const queries = CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES[chainId]

  for (const query of queries) {
    await dispatch(getOpportunityIds.initiate(query, options))
  }

  return
}

export const fetchAllStakingOpportunitiesUserDataByAccountId = async (
  dispatch: AppDispatch,
  accountId: AccountId,
  options?: StartQueryActionCreatorOptions,
) => {
  const { getOpportunitiesUserData, getOpportunityUserData } = opportunitiesApi.endpoints

  const chainId = fromAccountId(accountId).chainId
  assertIsKnownChainId(chainId)

  const stakingQueries = CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES[chainId]
    .filter(query => query.defiType === DefiType.Staking)
    .map(query => {
      return {
        ...query,
        accountId,
      }
    })

  const ethFoxStakingQueries = foxEthStakingIds.map(opportunityId => {
    return {
      accountId,
      opportunityId,
      defiType: DefiType.Staking,
      defiProvider: DefiProvider.EthFoxStaking,
    }
  })

  const rFoxStakingQueries = rFOXStakingIds.map(opportunityId => {
    return {
      accountId,
      opportunityId,
      defiType: DefiType.Staking,
      defiProvider: DefiProvider.rFOX,
    }
  })

  await Promise.allSettled([
    dispatch(
      getOpportunitiesUserData.initiate(
        stakingQueries,
        // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
        { forceRefetch: false, ...options },
      ),
    ),
    dispatch(
      getOpportunityUserData.initiate(
        ethFoxStakingQueries,
        // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
        { forceRefetch: false, ...options },
      ),
    ),
    dispatch(
      getOpportunityUserData.initiate(
        rFoxStakingQueries,
        // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
        { forceRefetch: false, ...options },
      ),
    ),
  ])
}

export const fetchAllOpportunitiesUserDataByAccountId = (
  dispatch: AppDispatch,
  accountId: AccountId,
  options?: StartQueryActionCreatorOptions,
) =>
  Promise.allSettled([
    fetchAllStakingOpportunitiesUserDataByAccountId(dispatch, accountId, options),
  ])
