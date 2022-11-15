import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getIdleInvestor } from 'features/defi/contexts/IdleProvider/idleInvestorSingleton'
import { logger } from 'lib/logger'
import { selectAssetById } from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  OpportunitiesState,
  OpportunityDefiType,
  StakingId,
} from '../types'
import type { ReduxApi } from './types'

const moduleLogger = logger.child({ namespace: ['opportunities', 'resolvers', 'idle'] })

export const idleStakingOpportunitiesMetadataResolver = async ({
  opportunityType,
  reduxApi,
}: {
  opportunityType: OpportunityDefiType
  reduxApi: ReduxApi
}): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const idleInvestor = getIdleInvestor()
  const opportunities = await idleInvestor.findAll()

  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const byId = await opportunities.reduce(
    async (acc: Promise<OpportunitiesState[DefiType.Staking]['byId'] | undefined>, opportunity) => {
      const assetId = toAssetId({
        assetNamespace: 'erc20',
        assetReference: opportunity.id,
        chainId: fromAssetId(opportunity.feeAsset.assetId).chainId,
      })

      let accResolved = await acc
      if (!accResolved) accResolved = {}

      const asset = selectAssetById(state, assetId)

      // Asset doesn't exist in portfolio, meaning this asset is bogus, e.g these two
      // https://etherscan.io/address/0xa0154a44c1c45bd007743fa622fd0da4f6d67d57
      // https://etherscan.io/address/0x5f45a578491a23ac5aee218e2d405347a0fafa8e
      if (!asset) return accResolved

      const rewardAssetIds = (await opportunity.getRewardAssetIds().catch(error => {
        moduleLogger.debug(
          { fn: 'idleStakingOpportunitiesMetadataResolver', error },
          'Error fetching Idle opportunities metadata',
        )
      })) as [AssetId] | [AssetId, AssetId] | [AssetId, AssetId, AssetId] | undefined

      accResolved[assetId as StakingId] = {
        apy: opportunity.apy.toString(),
        assetId,
        provider: DefiProvider.Idle,
        tvl: opportunity.tvl.balance.toString(),
        type: DefiType.Staking,
        underlyingAssetId: assetId,
        underlyingAssetIds: [opportunity.underlyingAsset.assetId],
        ...{ rewardAssetIds },
        // Idle opportunities wrap a single yield-bearing asset, so the ratio will always be 1
        underlyingAssetRatios: ['1'],
        name: asset.name,
      }

      return accResolved
    },
    Promise.resolve(undefined),
  )

  const data = {
    byId: byId as OpportunitiesState[DefiType.LiquidityPool]['byId'],
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
      const assetId = toAssetId({
        assetNamespace: 'erc20',
        assetReference: opportunity.id,
        chainId: fromAssetId(opportunity.feeAsset.assetId).chainId,
      }) as StakingId
      return assetId
    }),
  }
}
