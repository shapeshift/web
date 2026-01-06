import type { StartQueryActionCreatorOptions } from '@reduxjs/toolkit/query/react'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { foxEthStakingIds, rFOXStakingIds } from '../opportunitiesSlice/constants'
import { CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES } from './mappings'
import { opportunitiesApi } from './opportunitiesApiSlice'
import { DefiProvider, DefiType } from './types'

import { getConfig } from '@/config'
import type {
  StakingMetadataResult,
  UserStakingDataResult,
} from '@/lib/graphql/queries/useOpportunitiesQuery'
import {
  fetchStakingMetadata,
  fetchUserStakingData,
} from '@/lib/graphql/queries/useOpportunitiesQuery'
import { assertIsKnownChainId } from '@/lib/utils'
import { opportunities } from '@/state/slices/opportunitiesSlice/opportunitiesSlice'
import type { AppDispatch } from '@/state/store'

const isGraphQLEnabled = () => getConfig().VITE_FEATURE_GRAPHQL_POC

function transformStakingMetadata(results: StakingMetadataResult[]) {
  const byId: Record<string, any> = {}

  for (const result of results) {
    for (const opp of result.opportunities) {
      byId[opp.id] = {
        ...opp,
        type: DefiType.Staking,
      }
    }
  }

  return { type: DefiType.Staking, byId }
}

function transformUserStakingData(results: UserStakingDataResult[]) {
  const byId: Record<string, any> = {}

  for (const result of results) {
    for (const opp of result.opportunities) {
      byId[opp.userStakingId] = {
        ...opp,
      }
    }
  }

  return { byId }
}

export const fetchAllStakingOpportunitiesMetadataByChainId = async (
  dispatch: AppDispatch,
  chainId: ChainId,
  options?: StartQueryActionCreatorOptions,
) => {
  if (isGraphQLEnabled()) {
    console.log('[GraphQL POC] fetchAllStakingOpportunitiesMetadataByChainId called:', { chainId })
    const isCosmos = chainId.startsWith('cosmos:')

    const requests = [
      // Always fetch ETH_FOX_STAKING and SHAPE_SHIFT from Ethereum (they're Ethereum contracts)
      { chainId: ethChainId, provider: 'ETH_FOX_STAKING' as const },
      { chainId: ethChainId, provider: 'SHAPE_SHIFT' as const },
      // Fetch chain-specific providers
      { chainId, provider: 'THORCHAIN_SAVERS' as const },
      ...(chainId === KnownChainIds.ArbitrumMainnet
        ? [{ chainId, provider: 'RFOX' as const }]
        : []),
      ...(isCosmos ? [{ chainId, provider: 'COSMOS_SDK' as const }] : []),
      // THORChain-specific: fetch RUNEPOOL for Cosmos chains (THORChain uses cosmos namespace)
      ...(isCosmos ? [{ chainId, provider: 'RUNEPOOL' as const }] : []),
    ]

    console.log('[GraphQL POC] Fetching staking metadata for requests:', requests.length, requests)

    try {
      const results = await fetchStakingMetadata(requests)
      console.log('[GraphQL POC] fetchStakingMetadata returned:', results.length, 'results')

      if (results.length > 0) {
        const payload = transformStakingMetadata(results)
        dispatch(opportunities.actions.upsertOpportunitiesMetadata(payload))
        console.log('[GraphQL POC] Dispatched metadata to Redux')
      }
    } catch (error) {
      console.error('[GraphQL POC] ERROR in fetchStakingMetadata:', error)
      throw error
    }

    return
  }

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
  console.log('[GraphQL POC] fetchAllStakingOpportunitiesUserDataByAccountId called:', {
    accountId,
    isGraphQLEnabled: isGraphQLEnabled(),
  })

  if (isGraphQLEnabled()) {
    // Only fetch opportunityIds relevant to this account's chain
    // This prevents sending Ethereum opportunities to Bitcoin accounts
    const { chainId } = fromAccountId(accountId)
    const isEthereum = chainId === ethChainId
    const isArbitrum = chainId === KnownChainIds.ArbitrumMainnet
    const isCosmos = chainId.startsWith('cosmos:')

    const opportunityIds: string[] = []

    // ETH_FOX_STAKING and SHAPE_SHIFT are Ethereum contracts
    if (isEthereum) {
      opportunityIds.push(
        ...foxEthStakingIds,
        'eip155:1/erc20:0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b',
      )
    }

    // RFOX is on Arbitrum
    if (isArbitrum) {
      opportunityIds.push(...rFOXStakingIds)
    }

    // Cosmos chains: COSMOS_SDK validators and RUNEPOOL
    if (isCosmos) {
      // For Cosmos SDK, we use the wildcard to fetch all delegations
      opportunityIds.push('COSMOS_WILDCARD')
      // RUNEPOOL is THORChain-specific (uses cosmos:thorchain-1 namespace)
      if (chainId === 'cosmos:thorchain-1') {
        opportunityIds.push('cosmos:thorchain-1/slip44:931')
      }
    }

    console.log(
      '[GraphQL POC] Fetching user staking data for',
      opportunityIds.length,
      'opportunities (chain:',
      chainId,
      ')',
    )

    if (opportunityIds.length === 0) {
      console.log('[GraphQL POC] No relevant opportunities for chain:', chainId)
      return
    }

    const results = await fetchUserStakingData([{ accountId, opportunityIds }])

    console.log('[GraphQL POC] Got user staking results:', results.length, 'results')

    if (results.length > 0) {
      const payload = transformUserStakingData(results)
      dispatch(opportunities.actions.upsertUserStakingOpportunities(payload))
      console.log('[GraphQL POC] Dispatched user staking data to Redux')
    }

    return
  }

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
) => {
  console.log('[GraphQL POC] fetchAllOpportunitiesUserDataByAccountId called for:', accountId)
  return Promise.allSettled([
    fetchAllStakingOpportunitiesUserDataByAccountId(dispatch, accountId, options),
  ])
}
