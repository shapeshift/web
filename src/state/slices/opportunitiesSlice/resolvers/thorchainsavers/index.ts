import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import axios from 'axios'
import { getConfig } from 'config'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import memoize from 'lodash/memoize'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  OpportunitiesState,
  OpportunityId,
  OpportunityMetadata,
  StakingId,
} from '../../types'
import type { OpportunitiesMetadataResolverInput } from '../types'

const THOR_PRECISION = 8

const getThorchainPools = memoize(async (): Promise<ThornodePoolResponse[]> => {
  const { data: opportunitiesData } = await axios.get<ThornodePoolResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pools`,
  )

  if (!opportunitiesData) return []

  return opportunitiesData
})

export const thorchainSaversOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const thorchainPools = await getThorchainPools()

  if (!thorchainPools.length) return { data: [] }

  const opportunityIds = thorchainPools.reduce<OpportunityId[]>((acc, currentPool) => {
    const maybeOpportunityId = adapters.poolAssetIdToAssetId(currentPool.asset)

    if (
      bnOrZero(currentPool.savers_depth).gt(0) &&
      maybeOpportunityId &&
      currentPool.status === 'Available'
    ) {
      acc.push(maybeOpportunityId as StakingId)
    }

    return acc
  }, [])

  return {
    data: opportunityIds,
  }
}

export const thorchainSaversStakingOpportunitiesMetadataResolver = async ({
  opportunityIds,
  opportunityType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{ data: GetOpportunityMetadataOutput }> => {
  debugger
  if (!opportunityIds?.length) {
    return {
      data: {
        byId: {} as Partial<Record<StakingId, OpportunityMetadata>>,
        type: opportunityType,
      },
    }
  }

  const thorchainPools = await getThorchainPools()

  if (!thorchainPools?.length) {
    return {
      data: {
        byId: {} as Partial<Record<StakingId, OpportunityMetadata>>,
        type: opportunityType,
      },
    }
  }

  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesById: OpportunitiesState[DefiType.Staking]['byId'] = {}

  for (const thorchainPool of thorchainPools) {
    const maybeAssetId = adapters.poolAssetIdToAssetId(thorchainPool.asset)
    if (!maybeAssetId) continue

    const opportunityId = maybeAssetId as OpportunityId

    // Thorchain is slightly different from other opportunities in that there is no contract address for the opportunity
    // The way we represent it, the opportunityId is both the opportunityId/assetId and the underlyingAssetId
    // That's an oversimplification, as this ties a native AssetId e.g btcAssetId or ethAssetId, to a Savers opportunity
    // If we were to ever support another native asset staking opportunity e.g Ethereum 2.0 consensus layer staking
    // we would need to revisit this by using generic keys as an opportunityId
    const asset = selectAssetById(state, maybeAssetId)
    const underlyingAsset = selectAssetById(state, maybeAssetId)
    const marketData = selectMarketDataById(state, maybeAssetId)

    if (!asset || !underlyingAsset || !marketData) continue

    const tvl = bnOrZero(thorchainPool.savers_units)
      .div(bn(10).pow(THOR_PRECISION))
      .times(marketData.price)
      .toFixed()

    debugger

    stakingOpportunitiesById[opportunityId] = {
      // TODO(gomes): saversApr is exposed from https://midgard.ninerealms.com/v2/pools which we don't proxy yet
      // This is a function of liquidity over the last 4-5 days, so we can't just calculate it in the client
      apy: '42',
      assetId: maybeAssetId,
      provider: DefiProvider.ThorchainSavers,
      tvl,
      type: DefiType.Staking,
      underlyingAssetId: maybeAssetId,
      underlyingAssetIds: [maybeAssetId] as [AssetId],
      ...{
        rewardAssetIds: [maybeAssetId] as [AssetId],
      },
      // Thorchain opportunities represent a single native asset being staked, so the ratio will always be 1
      underlyingAssetRatios: ['1'],
      name: `${underlyingAsset.symbol} Vault`,
    }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: opportunityType,
  }

  return { data }
}
