import type { AssetId, ToAssetIdArgs } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getIdleInvestor } from 'features/defi/contexts/IdleProvider/idleInvestorSingleton'
import { bn } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { isSome } from 'lib/utils'
import {
  selectAssetById,
  selectPortfolioCryptoBalanceByFilter,
  selectStakingOpportunitiesById,
} from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
} from '../types'
import { serializeUserStakingId, toOpportunityId } from '../utils'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunitiesUserDataResolverInput,
} from './types'

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
        `Error fetching Idle opportunities metadata for opportunity ${assetId}`,
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

export const idleStakingOpportunitiesUserDataResolver = ({
  opportunityType,
  accountId, // TODO: Surely, idleInvestor.findAll() needs this?
  reduxApi,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  // TODO: We can do better and await the opportunity IDs query
  const stakingOpportunitiesById = selectStakingOpportunitiesById(state)
  const idleStakingOpportunityIds = Object.values(stakingOpportunitiesById)
    .filter(
      stakingOpportunity =>
        isSome(stakingOpportunity) && stakingOpportunity.provider === DefiProvider.Idle,
    )
    .map(stakingOpportunity => stakingOpportunity!.assetId)

  const stakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] = {}

  const idleInvestor = getIdleInvestor()

  idleStakingOpportunityIds.forEach(async stakingOpportunityId => {
    const balanceFilter = { accountId, assetId: stakingOpportunityId }
    const balance = selectPortfolioCryptoBalanceByFilter(state, balanceFilter)

    const asset = selectAssetById(state, stakingOpportunityId)
    if (!asset || bnOrZero(balance).eq(0)) return

    const opportunity = await idleInvestor.findByOpportunityId(stakingOpportunityId)
    if (!opportunity) return

    // TODO: lib tranches rewardAssetIds / reward amount implementation
    // Currently, lib is only able to get reward AssetIds / amounts for best yield, which is only 8 assets
    if (!opportunity.metadata.cdoAddress) {
      const claimableTokens = await opportunity.getClaimableTokens(fromAccountId(accountId).account)
      const totalClaimableRewards = claimableTokens.reduce((totalRewards, token) => {
        console.log({ totalRewards: totalRewards.toString() }, token)
        totalRewards = totalRewards.plus(token.amount)
        return totalRewards
      }, bnOrZero(0))
    }

    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: fromAssetId(stakingOpportunityId).assetNamespace,
      assetReference: fromAssetId(stakingOpportunityId).assetReference,
      chainId: fromAssetId(stakingOpportunityId).chainId,
    }
    const opportunityId = toOpportunityId(toAssetIdParts)
    const userStakingId = serializeUserStakingId(accountId, opportunityId)
    stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
      stakedAmountCryptoPrecision: bnOrZero(balance.toString())
        .div(bn(10).pow(asset.precision))
        .toString(),
      rewardsAmountCryptoPrecision: '0', // TODO: Not implemented
    }
  })

  const data = {
    byId: stakingOpportunitiesUserDataByUserStakingId,
    type: opportunityType,
  }

  return Promise.resolve({ data })
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
