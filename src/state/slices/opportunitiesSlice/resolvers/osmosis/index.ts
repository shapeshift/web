import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { osmosisChainId, toAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { selectAssetById, selectFeatureFlags } from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  LpId,
  OpportunityMetadata,
} from '../../types'
import { toOpportunityId } from '../../utils'
import type { OpportunitiesMetadataResolverInput, OpportunityIdsResolverInput } from '../types'
import { generateAssetIdFromOsmosisDenom, getPools } from './utils'

const OSMO_ATOM_LIQUIDITY_POOL_ID = '1'

export const osmosisLpOpportunitiesMetadataResolver = async ({
  opportunityType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState()
  const { OsmosisLP, OsmosisLPAdditionalPools } = selectFeatureFlags(state)
  const lpOpportunitiesById: Record<LpId, OpportunityMetadata> = {}

  if (!OsmosisLP) {
    throw new Error('Osmosis LP feature flag disabled. Pool metadata will not be fetched.')
  }
  const liquidityPools = await getPools()

  const _liquidityPools = OsmosisLPAdditionalPools
    ? liquidityPools
    : liquidityPools.filter(pool => pool.id === OSMO_ATOM_LIQUIDITY_POOL_ID) // Disable all pools other than OSMO/ATOM liquidity pool

  for (const pool of _liquidityPools) {
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
      id: opportunityId,
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

export const osmosisLpOpportunityIdsResolver = async ({
  reduxApi,
}: OpportunityIdsResolverInput): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState()
  const { OsmosisLP, OsmosisLPAdditionalPools } = selectFeatureFlags(state)

  if (!OsmosisLP) return { data: [] }

  const liquidityPools = await getPools()

  const _liquidityPools = OsmosisLPAdditionalPools
    ? liquidityPools
    : liquidityPools.filter(pool => {
        return pool.id === OSMO_ATOM_LIQUIDITY_POOL_ID
      }) // Disable all pools other than OSMO/ATOM liquidity pool

  return {
    data: _liquidityPools.map(pool => {
      return toOpportunityId({
        assetNamespace: 'ibc',
        assetReference: `/gamm/pool/${pool.id}`,
        chainId: osmosisChainId,
      })
    }),
  }
}
