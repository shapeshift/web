import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { USDC_PRECISION } from 'constants/constants'
import { getYearnInvestor } from 'features/defi/contexts/YearnProvider/yearnInvestorSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectPortfolioCryptoBalanceBaseUnitByFilter } from 'state/slices/common-selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
  OpportunityMetadata,
  StakingId,
} from '../../types'
import { DefiProvider, DefiType } from '../../types'
import { serializeUserStakingId, toOpportunityId } from '../../utils'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunitiesUserDataResolverInput,
  OpportunityIdsResolverInput,
} from '../types'

export const yearnStakingOpportunitiesMetadataResolver = async ({
  defiType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const { Yearn } = selectFeatureFlags(state)

  if (!Yearn) {
    return { data: { byId: {}, type: defiType } }
  }
  const opportunities = await (async () => {
    const maybeOpportunities = await getYearnInvestor().findAll()
    if (maybeOpportunities.length) return maybeOpportunities

    await getYearnInvestor().initialize()
    return await getYearnInvestor().findAll()
  })()

  const stakingOpportunitiesById: Record<StakingId, OpportunityMetadata> = {}

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
      id: opportunityId,
      provider: DefiProvider.Yearn,
      tvl: bnOrZero(opportunity.tvl.balanceUsdc).div(`1e+${USDC_PRECISION}`).toString(),
      type: DefiType.Staking,
      underlyingAssetId: assetId,
      underlyingAssetIds: [opportunity.underlyingAsset.assetId],
      underlyingAssetRatiosBaseUnit: ['1000000000000000000'],
      name: `${underlyingAsset.symbol} Vault`,
      version: opportunity.version,
      expired: opportunity.expired,
      rewardAssetIds: [],
      isClaimableRewards: false,
    }
  }
  const data = {
    byId: stakingOpportunitiesById,
    type: defiType,
  }

  return { data }
}

export const yearnStakingOpportunitiesUserDataResolver = async ({
  defiType,
  accountId,
  reduxApi,
  opportunityIds,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const { Yearn } = selectFeatureFlags(state)

  if (!Yearn)
    return {
      data: {
        byId: {},
      },
    }

  const stakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] = {}

  const yearnInvestor = getYearnInvestor()

  for (const stakingOpportunityId of opportunityIds) {
    const balanceFilter = { accountId, assetId: stakingOpportunityId }
    const balance = selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter)

    const asset = selectAssetById(state, stakingOpportunityId)
    if (!asset) continue

    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: fromAssetId(stakingOpportunityId).assetNamespace,
      assetReference: fromAssetId(stakingOpportunityId).assetReference,
      chainId: fromAssetId(stakingOpportunityId).chainId,
    }
    const opportunityId = toOpportunityId(toAssetIdParts)
    const userStakingId = serializeUserStakingId(accountId, opportunityId)

    // Yearn doesn't have rewards so we set this to 0 and an empty array
    if (bnOrZero(balance).eq(0)) {
      stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
        userStakingId,
        stakedAmountCryptoBaseUnit: '0',
        rewardsCryptoBaseUnit: { amounts: ['0'], claimable: false },
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
      userStakingId,
      stakedAmountCryptoBaseUnit: balance,
      rewardsCryptoBaseUnit: { amounts: rewardsAmountsCryptoBaseUnit, claimable: false },
    }
  }

  const data = {
    byId: stakingOpportunitiesUserDataByUserStakingId,
    type: defiType,
  }

  return Promise.resolve({ data })
}

export const yearnStakingOpportunityIdsResolver = async ({
  reduxApi,
}: OpportunityIdsResolverInput): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const { Yearn } = selectFeatureFlags(state)
  if (!Yearn) {
    return { data: [] }
  }
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
