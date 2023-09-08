import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectPortfolioCryptoBalanceBaseUnitByFilter } from 'state/slices/common-selectors'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

import type {
  AssetIdsTuple,
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
import { getIdleInvestor } from './idleInvestorSingleton'

export const idleStakingOpportunitiesMetadataResolver = async ({
  defiType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const { IdleFinance } = selectFeatureFlags(state)

  const opportunities = await (async () => {
    const maybeOpportunities = await getIdleInvestor().findAll()
    if (maybeOpportunities.length) return maybeOpportunities

    await getIdleInvestor().initialize()
    return await getIdleInvestor().findAll()
  })()

  if (!IdleFinance) {
    return {
      data: {
        byId: {},
        type: defiType,
      },
    }
  }
  if (!opportunities?.length) {
    const data = {
      byId: {},
      type: defiType,
    } as const

    return {
      data,
    }
  }

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

    // Asset doesn't exist in portfolio, meaning this asset is bogus, e.g these two
    // https://etherscan.io/address/0xa0154a44c1c45bd007743fa622fd0da4f6d67d57
    // https://etherscan.io/address/0x5f45a578491a23ac5aee218e2d405347a0fafa8e
    if (!asset || !underlyingAsset) continue

    const rewardAssetIds = (await opportunity.getRewardAssetIds().catch(error => {
      console.error(error)
      return []
    })) as AssetIdsTuple

    stakingOpportunitiesById[opportunityId] = {
      active: opportunity.active,
      apy: opportunity.apy.toFixed(),
      assetId,
      cdoAddress: opportunity.metadata.cdoAddress,
      id: opportunityId,
      provider: DefiProvider.Idle,
      tvl: opportunity.tvl.balance.toFixed(),
      type: DefiType.Staking,
      underlyingAssetId: assetId,
      underlyingAssetIds: [opportunity.underlyingAsset.assetId],
      rewardAssetIds,
      isClaimableRewards: Boolean(rewardAssetIds.length),
      // Idle opportunities wrap a single yield-bearing asset, so in terms of ratio will always be "100%" of the pool
      // However, since the ratio is used to calculate the underlying amounts, it needs to be greater than 1
      // As 1 Idle token wraps ~1.0x* underlying
      underlyingAssetRatiosBaseUnit: [
        opportunity.positionAsset.underlyingPerPosition
          .times(bn(10).pow(underlyingAsset.precision))
          .toFixed(),
      ],
      name: `${underlyingAsset.symbol} Vault`,
      version: opportunity.version,
      tags: [opportunity.strategy],
    }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: defiType,
  }

  return { data }
}

export const idleStakingOpportunitiesUserDataResolver = async ({
  defiType,
  accountId,
  reduxApi,
  opportunityIds,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const { IdleFinance } = selectFeatureFlags(state)

  if (!IdleFinance)
    return Promise.resolve({
      data: {
        byId: {},
        type: defiType,
      },
    })

  const stakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] = {}

  const idleInvestor = getIdleInvestor()

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

    // This works because of Idle assets being both a portfolio-owned asset and a yield-bearing "staking asset"
    // If you use me as a reference and copy me into a resolver for another opportunity, that might or might not be the case
    // Don't do what monkey see, and adapt the business logic to the opportunity you're implementing
    if (bnOrZero(balance).eq(0)) {
      // Zero out this user staking opportunity including rewards - all rewards are automatically claimed when withdrawing, see
      // https://docs.idle.finance/developers/best-yield/methods/redeemidletoken-1
      // https://docs.idle.finance/developers/perpetual-yield-tranches/methods/withdrawbb
      stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
        userStakingId,
        stakedAmountCryptoBaseUnit: '0',
        rewardsCryptoBaseUnit: { amounts: ['0'], claimable: false },
      }
      continue
    }

    const opportunity = await (async () => {
      const maybeOpportunities = await idleInvestor.findAll()
      if (maybeOpportunities.length)
        return await idleInvestor.findByOpportunityId(stakingOpportunityId)

      await idleInvestor.findAll()
      return await idleInvestor.findByOpportunityId(stakingOpportunityId)
    })()

    if (!opportunity) continue

    let rewardsAmountsCryptoBaseUnit = ['0'] as [string] | [string, string]
    // TODO: lib tranches rewardAssetIds / reward amount implementation
    // Currently, lib is only able to get reward AssetIds / amounts for best yield, which is only 8 assets
    if (!opportunity.metadata.cdoAddress) {
      const claimableTokens = await opportunity
        .getClaimableTokens(fromAccountId(accountId).account)
        .catch(_e => [])
      rewardsAmountsCryptoBaseUnit = claimableTokens.map(token => {
        const asset = selectAssetById(state, token.assetId)
        if (!asset) return '0'
        return bnOrZero(token.amount).toFixed()
      }) as [string] | [string, string]
    }

    const rewardAssetIds = (await opportunity.getRewardAssetIds().catch(error => {
      console.error(error)
      return []
    })) as AssetIdsTuple
    stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
      userStakingId,
      stakedAmountCryptoBaseUnit: balance,
      rewardsCryptoBaseUnit: {
        amounts: rewardsAmountsCryptoBaseUnit,
        claimable: Boolean(rewardAssetIds.length),
      },
    }
  }

  const data = {
    byId: stakingOpportunitiesUserDataByUserStakingId,
    type: defiType,
  }

  return Promise.resolve({ data })
}

export const idleStakingOpportunityIdsResolver = async ({
  reduxApi,
}: OpportunityIdsResolverInput): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const { IdleFinance } = selectFeatureFlags(state)
  if (!IdleFinance) {
    return { data: [] }
  }

  const opportunities = await (async () => {
    const maybeOpportunities = await getIdleInvestor().findAll()
    if (maybeOpportunities.length) return maybeOpportunities

    await getIdleInvestor().initialize()
    return await getIdleInvestor().findAll()
  })()

  if (!opportunities?.length) {
    return {
      data: [],
    }
  }

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
