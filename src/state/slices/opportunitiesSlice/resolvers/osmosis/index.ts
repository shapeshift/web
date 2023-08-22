import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { osmosisChainId, toAssetId } from '@shapeshiftoss/caip'
import { bn } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  LpId,
  OpportunityMetadata,
} from '../../types'
import { DefiProvider, DefiType } from '../../types'
import { toOpportunityId } from '../../utils'
import type { OpportunitiesMetadataResolverInput, OpportunityIdsResolverInput } from '../types'
import { generateAssetIdFromOsmosisDenom, getPools } from './utils'

const OSMO_ATOM_LIQUIDITY_POOL_ID = '1'

export const osmosisLpOpportunitiesMetadataResolver = async ({
  defiType,
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
    const underlyingAssetId0 = generateAssetIdFromOsmosisDenom(pool.pool_assets[0].token.denom)
    const underlyingAssetId1 = generateAssetIdFromOsmosisDenom(pool.pool_assets[1].token.denom)
    const opportunityId = toOpportunityId(toAssetIdParts)
    const asset = selectAssetById(state, assetId)

    if (!asset) continue

    const totalSupply = bn(pool.total_shares.amount)
    const token0Reserves = bn(pool.pool_assets[0].token.amount)
    const token1Reserves = bn(pool.pool_assets[1].token.amount)

    const token0PoolRatio = token0Reserves.div(totalSupply)
    const token1PoolRatio = token1Reserves.div(totalSupply)

    lpOpportunitiesById[opportunityId] = {
      apy: pool.apy,
      assetId,
      id: opportunityId,
      provider: DefiProvider.OsmosisLp,
      tvl: pool.tvl,
      type: DefiType.LiquidityPool,
      underlyingAssetId: assetId,
      underlyingAssetIds: [underlyingAssetId0, underlyingAssetId1],
      underlyingAssetRatiosBaseUnit: [
        token0PoolRatio.times(bn(10).pow(asset.precision)).toFixed(),
        token1PoolRatio.times(bn(10).pow(asset.precision)).toFixed(),
      ] as const,
      name: pool.name,
      rewardAssetIds: [],
      isClaimableRewards: false,
    }
  }

  const data = {
    byId: lpOpportunitiesById,
    type: defiType,
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
