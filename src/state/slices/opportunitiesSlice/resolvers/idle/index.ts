import type { AssetId, ToAssetIdArgs } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getIdleInvestor } from 'features/defi/contexts/IdleProvider/idleInvestorSingleton'
import { bn } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAssetById, selectPortfolioCryptoBalanceByFilter } from 'state/slices/selectors'

import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
} from '../../types'
import { serializeUserStakingId, toOpportunityId } from '../../utils'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunitiesUserDataResolverInput,
} from '../types'
import { BASE_OPPORTUNITIES_BY_ID } from './constants'

const moduleLogger = logger.child({ namespace: ['opportunities', 'resolvers', 'idle'] })

export const idleStakingOpportunitiesMetadataResolver = async ({
  opportunityType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const opportunities = await (async () => {
    const maybeOpportunities = await getIdleInvestor().findAll()
    if (maybeOpportunities.length) return maybeOpportunities

    await getIdleInvestor().initialize()
    return await getIdleInvestor().findAll()
  })()

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
    const underlyingAsset = selectAssetById(state, opportunity.underlyingAsset.assetId)

    // Asset doesn't exist in portfolio, meaning this asset is bogus, e.g these two
    // https://etherscan.io/address/0xa0154a44c1c45bd007743fa622fd0da4f6d67d57
    // https://etherscan.io/address/0x5f45a578491a23ac5aee218e2d405347a0fafa8e
    if (!asset) continue

    const baseOpportunity = BASE_OPPORTUNITIES_BY_ID[opportunityId]
    if (!baseOpportunity) {
      moduleLogger.warn(`
        No base opportunity found for ${opportunityId} in BASE_OPPORTUNITIES_BY_ID, refetching.
        Add me to avoid re-fetching from the contract.
        `)
    }
    // If we have snapshotted opportunity metadata, all we need is to slap APY and TVL in
    // Else, let's populate this opportunity from the fetched one and slap the rewardAssetId
    stakingOpportunitiesById[opportunityId] = baseOpportunity
      ? {
          ...baseOpportunity,
          apy: opportunity.apy.toFixed(),
          tvl: opportunity.tvl.balanceUsdc.toFixed(),
        }
      : {
          apy: opportunity.apy.toFixed(),
          assetId,
          provider: DefiProvider.Idle,
          tvl: opportunity.tvl.balance.toFixed(),
          type: DefiType.Staking,
          underlyingAssetId: assetId,
          underlyingAssetIds: [opportunity.underlyingAsset.assetId],
          ...{
            rewardAssetIds: (await opportunity.getRewardAssetIds().catch(error => {
              moduleLogger.debug(
                { fn: 'idleStakingOpportunitiesMetadataResolver', error },
                `Error fetching Idle opportunities metadata for opportunity ${assetId}`,
              )
            })) as [AssetId] | [AssetId, AssetId] | [AssetId, AssetId, AssetId] | undefined,
          },
          // Idle opportunities wrap a single yield-bearing asset, so the ratio will always be 1
          underlyingAssetRatios: ['1'],
          name: `${underlyingAsset.symbol} Vault (${opportunity.version})`,
        }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: opportunityType,
  }

  return { data }
}

export const idleStakingOpportunitiesUserDataResolver = async ({
  opportunityType,
  accountId,
  reduxApi,
  opportunityIds,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] = {}

  const idleInvestor = getIdleInvestor()

  for (const stakingOpportunityId of opportunityIds) {
    const balanceFilter = { accountId, assetId: stakingOpportunityId }
    const balance = selectPortfolioCryptoBalanceByFilter(state, balanceFilter)

    const asset = selectAssetById(state, stakingOpportunityId)
    if (!asset || bnOrZero(balance).eq(0)) continue

    const opportunity = await (async () => {
      const maybeOpportunities = await idleInvestor.findAll()
      if (maybeOpportunities.length)
        return await idleInvestor.findByOpportunityId(stakingOpportunityId)

      await idleInvestor.findAll()
      return await idleInvestor.findByOpportunityId(stakingOpportunityId)
    })()

    if (!opportunity) continue

    let rewardsAmountsCryptoPrecision = ['0'] as [string] | [string, string]
    // TODO: lib tranches rewardAssetIds / reward amount implementation
    // Currently, lib is only able to get reward AssetIds / amounts for best yield, which is only 8 assets
    if (!opportunity.metadata.cdoAddress) {
      const claimableTokens = await opportunity.getClaimableTokens(fromAccountId(accountId).account)
      rewardsAmountsCryptoPrecision = claimableTokens.map(token => {
        const asset = selectAssetById(state, token.assetId)
        if (!asset) return '0'
        return bnOrZero(token.amount).div(bn(10).pow(asset.precision)).toFixed()
      }) as [string] | [string, string]
    }

    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: fromAssetId(stakingOpportunityId).assetNamespace,
      assetReference: fromAssetId(stakingOpportunityId).assetReference,
      chainId: fromAssetId(stakingOpportunityId).chainId,
    }
    const opportunityId = toOpportunityId(toAssetIdParts)
    const userStakingId = serializeUserStakingId(accountId, opportunityId)
    stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
      stakedAmountCryptoPrecision: bnOrZero(balance).div(bn(10).pow(asset.precision)).toString(),
      rewardsAmountsCryptoPrecision,
    }
  }

  const data = {
    byId: stakingOpportunitiesUserDataByUserStakingId,
    type: opportunityType,
  }

  return Promise.resolve({ data })
}

export const idleStakingOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const opportunities = await (async () => {
    const maybeOpportunities = await getIdleInvestor().findAll()
    if (maybeOpportunities.length) return maybeOpportunities

    await getIdleInvestor().initialize()
    return await getIdleInvestor().findAll()
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
