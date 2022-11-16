import type { AssetId, ToAssetIdArgs } from '@shapeshiftoss/caip'
import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getIdleInvestor } from 'features/defi/contexts/IdleProvider/idleInvestorSingleton'
import { logger } from 'lib/logger'
import { selectAssetById } from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  OpportunitiesState,
} from '../types'
import { toOpportunityId } from '../utils'
import type { OpportunitiesMetadataResolverInput } from './types'

const moduleLogger = logger.child({ namespace: ['opportunities', 'resolvers', 'idle'] })

export const idleStakingOpportunitiesMetadataResolver = async ({
  opportunityType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const idleInvestor = getIdleInvestor()
  const opportunities = await idleInvestor.findAll()

  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesById: OpportunitiesState[DefiType.Staking]['byId'] = {}

  for (const opportunity of opportunities) {
    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: 'erc20',
      assetReference: opportunity.id,
      chainId: fromAssetId(opportunity.feeAsset.assetId).chainId,
    }
    const assetId = toAssetId(toAssetIdParts)
    const opportunityId = toOpportunityId(toAssetIdParts)

    const asset = selectAssetById(state, assetId)

    // Asset doesn't exist in portfolio, meaning this asset is bogus, e.g these two
    // https://etherscan.io/address/0xa0154a44c1c45bd007743fa622fd0da4f6d67d57
    // https://etherscan.io/address/0x5f45a578491a23ac5aee218e2d405347a0fafa8e
    if (!asset) continue

    const rewardAssetIds = (await opportunity.getRewardAssetIds().catch(error => {
      moduleLogger.debug(
        { fn: 'idleStakingOpportunitiesMetadataResolver', error },
        'Error fetching Idle opportunities metadata',
      )
    })) as [AssetId] | [AssetId, AssetId] | [AssetId, AssetId, AssetId] | undefined

    stakingOpportunitiesById[opportunityId] = {
      apy: opportunity.apy.toFixed(),
      assetId,
      provider: DefiProvider.Idle,
      tvl: opportunity.tvl.balance.toFixed(),
      type: DefiType.Staking,
      underlyingAssetId: assetId,
      underlyingAssetIds: [opportunity.underlyingAsset.assetId],
      ...{ rewardAssetIds },
      // Idle opportunities wrap a single yield-bearing asset, so the ratio will always be 1
      underlyingAssetRatios: ['1'],
      name: asset.name,
    }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: opportunityType,
  }

  return { data }
}

export const idleStakingOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const idleInvestor = getIdleInvestor()
  const opportunities = await idleInvestor.findAll()

  return {
    data: opportunities.map(opportunity => {
      const assetId = toOpportunityId({
        assetNamespace: 'erc20',
        assetReference: opportunity.id,
        chainId: fromAssetId(opportunity.feeAsset.assetId).chainId,
      })
      return assetId
    }),
  }
}
