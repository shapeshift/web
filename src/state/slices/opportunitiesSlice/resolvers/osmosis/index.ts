import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { fromAccountId, osmosisChainId, toAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { ReduxState } from 'state/reducer'
import type { PortfolioAccountBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAssetById,
  selectFeatureFlags,
  selectPortfolioAccountBalances,
  selectPortfolioLoadingStatusGranular,
} from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  LpId,
  OpportunityMetadata,
} from '../../types'
import { toOpportunityId } from '../../utils'
import type { OpportunitiesMetadataResolverInput, OpportunityUserDataResolverInput } from '../types'
import { generateAssetIdFromOsmosisDenom, getPools } from './utils'

export const osmosisLpOpportunitiesMetadataResolver = async ({
  opportunityType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState()

  const lpOpportunitiesById: Record<LpId, OpportunityMetadata> = {}

  const { OsmosisLP } = selectFeatureFlags(state)

  if (!OsmosisLP) {
    throw new Error('Osmosis LP feature flag disabled. Pool metadata will not be fetched.')
  }
  const liquidityPools = await getPools()

  for (const pool of liquidityPools) {
    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: 'ibc',
      assetReference: `gamm/pool/${pool.id}`,
      chainId: osmosisChainId,
    }

    const assetId = toAssetId(toAssetIdParts)
    const opportunityId = toOpportunityId(toAssetIdParts)
    const asset = selectAssetById(state, assetId)

    if (!asset) continue

    lpOpportunitiesById[opportunityId] = {
      apy: pool.apy,
      assetId,
      provider: DefiProvider.Osmosis,
      tvl: pool.tvl,
      type: DefiType.LiquidityPool,
      underlyingAssetId: assetId,
      underlyingAssetIds: [
        generateAssetIdFromOsmosisDenom(pool.pool_assets[0].token.denom),
        generateAssetIdFromOsmosisDenom(pool.pool_assets[1].token.denom),
      ],
      underlyingAssetRatiosBaseUnit: [
        pool.pool_assets[0].token.amount,
        pool.pool_assets[1].token.amount,
      ],
      name: pool.name,
    }
  }

  const data = {
    byId: lpOpportunitiesById,
    type: opportunityType,
  }

  return { data }
}

export const osmosisLpUserDataResolver = ({
  opportunityId,
  opportunityType: _opportunityType,
  accountId,
  reduxApi,
}: OpportunityUserDataResolverInput): Promise<void> => {
  const { chainId: accountChainId } = fromAccountId(accountId)
  // Looks the same as the happy path but isn't, we won't hit this as a guard with non-Osmosis account ChainIds
  if (accountChainId !== osmosisChainId) return Promise.resolve()

  const { getState } = reduxApi
  const state: ReduxState = getState() as any
  const portfolioLoadingStatusGranular = selectPortfolioLoadingStatusGranular(state)

  // Reject RTK query if account portfolio data is granularily loading
  if (portfolioLoadingStatusGranular?.[accountId] === 'loading')
    throw new Error(`Portfolio data not loaded for ${accountId}`)

  const balances: PortfolioAccountBalancesById = selectPortfolioAccountBalances(state)

  const hasPortfolioData = Boolean(balances[accountId][opportunityId])

  // Reject RTK query if there's no account portfolio data for this LP token
  if (!hasPortfolioData) {
    throw new Error('no portfolio data')
  }

  // All checks passed, resolve the promise so we continue the RTK query execution and populate LP/Account IDs
  return Promise.resolve()
}

export const osmosisLpOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const liquidityPools = await getPools()

  return {
    data: liquidityPools.map(pool => {
      return toOpportunityId({
        assetNamespace: 'ibc',
        assetReference: `/gamm/pool/${pool.id}`,
        chainId: osmosisChainId,
      })
    }),
  }
}
