import type { StartQueryActionCreatorOptions } from '@reduxjs/toolkit/dist/query/core/buildInitiate'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { assertIsKnownChainId } from 'lib/utils'
import type { AppDispatch } from 'state/store'

import { foxEthStakingIds, rFOXStakingIds } from '../opportunitiesSlice/constants'
import { CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES } from './mappings'
import { opportunitiesApi } from './opportunitiesApiSlice'
import { DefiProvider, DefiType } from './types'

export const fetchAllLpOpportunitiesMetadataByChainId = async (
  dispatch: AppDispatch,
  chainId: ChainId,
  options?: StartQueryActionCreatorOptions,
) => {
  const { getOpportunitiesMetadata } = opportunitiesApi.endpoints

  assertIsKnownChainId(chainId)
  const queries = CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES[chainId]

  const lpQueries = queries.filter(query => query.defiType === DefiType.LiquidityPool)

  await dispatch(
    getOpportunitiesMetadata.initiate(
      lpQueries,
      // Any previous query without portfolio loaded will be rejected, the first successful one will be cached
      { forceRefetch: false, ...options },
    ),
  )
}

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

export const fetchAllOpportunitiesMetadataByChainId = async (
  dispatch: AppDispatch,
  chainId: ChainId,
  options?: StartQueryActionCreatorOptions,
) => {
  // Don't Promise.all() me - parallel execution would be better, but the market data of the LP tokens gets populated when fetching LP opportunities
  // Without it, we won't have all we need to populate the staking one - which is relying on the market data of the staked LP token for EVM chains LP token farming
  await fetchAllLpOpportunitiesMetadataByChainId(dispatch, chainId, options)
  await fetchAllStakingOpportunitiesMetadataByChainId(dispatch, chainId, options)
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

export const fetchAllLpOpportunitiesUserdataByAccountId = (
  _dispatch: AppDispatch,
  _accountId: AccountId,
  _options?: StartQueryActionCreatorOptions,
  // User data for all our current LP opportunities is held as a portfolio balance, there's no need to fetch it
) => Promise.resolve()

export const fetchAllOpportunitiesUserDataByAccountId = (
  dispatch: AppDispatch,
  accountId: AccountId,
  options?: StartQueryActionCreatorOptions,
) =>
  Promise.allSettled([
    fetchAllLpOpportunitiesUserdataByAccountId(dispatch, accountId, options),
    fetchAllStakingOpportunitiesUserDataByAccountId(dispatch, accountId, options),
  ])
