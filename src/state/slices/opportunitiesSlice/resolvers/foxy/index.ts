import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { ethChainId, foxyAssetId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { foxyApi } from 'state/apis/foxy/foxyApi'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
} from 'state/slices/selectors'

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

export const foxyStakingOpportunitiesMetadataResolver = async ({
  opportunityType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const opportunities = await getFoxyApi().getFoxyOpportunities()

  const foxyApr = await reduxApi.dispatch(foxyApi.endpoints.getFoxyApr.initiate())

  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesById: OpportunitiesState[DefiType.Staking]['byId'] = {}

  for (const opportunity of opportunities) {
    // FOXY Token
    const rewardTokenAssetId = toAssetId({
      chainId: ethChainId,
      assetNamespace: 'erc20',
      assetReference: opportunity.rewardToken,
    })
    // FOX Token
    const tokenAssetId = toAssetId({
      chainId: ethChainId,
      assetNamespace: 'erc20',
      assetReference: opportunity.stakingToken,
    })
    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: 'erc20',
      assetReference: opportunity.contractAddress,
      chainId: ethChainId,
    }

    const assetId = toAssetId(toAssetIdParts)
    const opportunityId = toOpportunityId(toAssetIdParts)
    const underlyingAsset = selectAssetById(state, tokenAssetId)
    const marketData = selectMarketDataById(state, tokenAssetId)

    if (!underlyingAsset) continue

    // If we have snapshotted opportunity metadata, all we need is to slap APY and TVL in
    // Else, let's populate this opportunity from the fetched one and slap the rewardAssetId

    const tvl = bnOrZero(opportunity.tvl)
      .div(`1e+${underlyingAsset?.precision}`)
      .times(marketData.price)
      .toString()

    const apy = foxyApr.data?.foxyApr ?? '0'

    stakingOpportunitiesById[opportunityId] = {
      apy,
      assetId,
      provider: DefiProvider.ShapeShift,
      tvl,
      type: DefiType.Staking as const,
      underlyingAssetId: rewardTokenAssetId,
      underlyingAssetIds: [tokenAssetId],
      // Idle opportunities wrap a single yield-bearing asset, so the ratio will always be 1
      underlyingAssetRatios: ['1'],
      name: `${underlyingAsset.symbol}`,
    }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: opportunityType,
  }

  return { data }
}

export const foxyStakingOpportunitiesUserDataResolver = async ({
  opportunityType,
  accountId,
  reduxApi,
  opportunityIds,
}: OpportunitiesUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesUserDataByUserStakingId: OpportunitiesState['userStaking']['byId'] = {}

  const foxyInvestor = getFoxyApi()

  for (const stakingOpportunityId of opportunityIds) {
    const balanceFilter = { accountId, assetId: foxyAssetId }
    const balance = selectPortfolioCryptoBalanceByFilter(state, balanceFilter)

    const asset = selectAssetById(state, foxyAssetId)
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
        stakedAmountCryptoBaseUnit: '0',
        rewardsAmountsCryptoBaseUnit: [],
      }
      continue
    }

    const opportunity = await foxyInvestor.getFoxyOpportunities()

    if (!opportunity[0]) continue

    //FOXy is a rebasing token so there aren't rewards to claim
    let rewardsAmountsCryptoBaseUnit = ['0'] as [string] | [string, string]

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

export const foxyStakingOpportunityIdsResolver = async (): Promise<{
  data: GetOpportunityIdsOutput
}> => {
  const opportunities = await getFoxyApi().getFoxyOpportunities()

  return {
    data: opportunities.map(opportunity => {
      const assetId = toOpportunityId({
        assetNamespace: 'erc20',
        assetReference: opportunity.contractAddress,
        chainId: ethChainId,
      })
      return assetId
    }),
  }
}
