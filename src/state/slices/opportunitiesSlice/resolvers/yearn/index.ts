import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { USDC_PRECISION } from 'constants/constants'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getYearnInvestor } from 'features/defi/contexts/YearnProvider/yearnInvestorSingleton'
import { selectAssetById, selectPortfolioCryptoBalanceByFilter } from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
  OpportunityMetadata,
  StakingId,
} from '../../types'
import { serializeUserStakingId, toOpportunityId } from '../../utils'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunitiesUserDataResolverInput,
} from '../types'

export const yearnStakingOpportunitiesMetadataResolver = async ({
  opportunityType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput<DefiProvider.Yearn, DefiType.Staking>
}> => {
  const opportunities = await (async () => {
    const maybeOpportunities = await getYearnInvestor().findAll()
    if (maybeOpportunities.length) return maybeOpportunities

    await getYearnInvestor().initialize()
    return await getYearnInvestor().findAll()
  })()

  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesById: Record<
    StakingId,
    OpportunityMetadata<DefiProvider.Yearn, DefiType.Staking>
  > = {}

  for (const opportunity of opportunities) {
    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: 'erc20',
      assetReference: opportunity.id,
      chainId: fromAssetId(opportunity.feeAsset.assetId).chainId,
    }
    const assetId = toAssetId(toAssetIdParts)
    const opportunityId = toOpportunityId(toAssetIdParts)

    const asset = selectAssetById(state, assetId)
    const underlyingAsset = selectAssetById(state, opportunity.underlyingAsset.assetId)

    if (!asset || !underlyingAsset) continue

    stakingOpportunitiesById[opportunityId] = {
      apy: opportunity.apy.toFixed(),
      assetId,
      provider: DefiProvider.Yearn,
      tvl: bnOrZero(opportunity.tvl.balanceUsdc).div(`1e+${USDC_PRECISION}`).toString(),
      type: DefiType.Staking,
      underlyingAssetId: assetId,
      underlyingAssetIds: [opportunity.underlyingAsset.assetId],
      underlyingAssetRatios: ['1'],
      name: `${underlyingAsset.symbol} Vault`,
      version: opportunity.version,
      expired: opportunity.expired,
    }
  }
  const data = {
    byId: stakingOpportunitiesById,
    type: opportunityType,
  }

  return { data }
}

export const yearnStakingOpportunitiesUserDataResolver = async ({
  opportunityType,
  accountId,
  reduxApi,
  opportunityIds,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] = {}

  const yearnInvestor = getYearnInvestor()

  for (const stakingOpportunityId of opportunityIds) {
    const balanceFilter = { accountId, assetId: stakingOpportunityId }
    const balance = selectPortfolioCryptoBalanceByFilter(state, balanceFilter)

    const asset = selectAssetById(state, stakingOpportunityId)
    if (!asset) continue

    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: fromAssetId(stakingOpportunityId).assetNamespace,
      assetReference: fromAssetId(stakingOpportunityId).assetReference,
      chainId: fromAssetId(stakingOpportunityId).chainId,
    }
    const opportunityId = toOpportunityId(toAssetIdParts)
    const userStakingId = serializeUserStakingId(accountId, opportunityId)

    //Yearn doesn't have rewards so we set this to 0 and an empty array
    if (bnOrZero(balance).eq(0)) {
      stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
        stakedAmountCryptoBaseUnit: '0',
        rewardsAmountsCryptoBaseUnit: [],
      }
      continue
    }

    const opportunity = await (async () => {
      const maybeOpportunities = await yearnInvestor.findAll()
      if (maybeOpportunities.length)
        return await yearnInvestor.findByOpportunityId(stakingOpportunityId)

      await yearnInvestor.findAll()
      return await yearnInvestor.findByOpportunityId(stakingOpportunityId)
    })()

    if (!opportunity) continue

    let rewardsAmountsCryptoBaseUnit = [] as []

    stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
      stakedAmountCryptoBaseUnit: balance,
      rewardsAmountsCryptoBaseUnit,
    }
  }

  const data = {
    byId: stakingOpportunitiesUserDataByUserStakingId,
    type: opportunityType,
  }

  return Promise.resolve({ data })
}

export const yearnStakingOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const opportunities = await (async () => {
    const maybeOpportunities = await getYearnInvestor().findAll()
    if (maybeOpportunities.length) return maybeOpportunities

    await getYearnInvestor().initialize()
    return await getYearnInvestor().findAll()
  })()

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
