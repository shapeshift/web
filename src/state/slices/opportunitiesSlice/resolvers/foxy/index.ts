import type { ToAssetIdArgs } from '@shapeshiftoss/caip'
import { ethChainId, foxyAssetId, fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { foxyApi } from 'state/apis/foxy/foxyApi'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectPortfolioCryptoBalanceBaseUnitByFilter } from 'state/slices/common-selectors'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { selectBip44ParamsByAccountId } from 'state/slices/portfolioSlice/selectors'

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
} from '../types'

export const foxyStakingOpportunitiesMetadataResolver = async ({
  defiType,
  reduxApi,
}: OpportunitiesMetadataResolverInput): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const allOpportunities = await getFoxyApi().getFoxyOpportunities()

  const foxyApr = await reduxApi.dispatch(foxyApi.endpoints.getFoxyApr.initiate())

  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const stakingOpportunitiesById: Record<StakingId, OpportunityMetadata> = {}

  for (const opportunity of allOpportunities) {
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
    // FOXy staking contract
    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: 'erc20',
      assetReference: opportunity.contractAddress,
      chainId: ethChainId,
    }

    const assetId = toAssetId(toAssetIdParts)
    const opportunityId = toOpportunityId(toAssetIdParts)
    const underlyingAsset = selectAssetById(state, tokenAssetId)
    const marketData = selectMarketDataByAssetIdUserCurrency(state, tokenAssetId)

    if (!underlyingAsset) continue

    const tvl = bnOrZero(opportunity.tvl)
      .div(`1e+${underlyingAsset?.precision}`)
      .times(marketData.price)
      .toString()

    const apy = foxyApr.data?.foxyApr ?? '0'

    stakingOpportunitiesById[opportunityId] = {
      apy,
      assetId,
      id: opportunityId,
      provider: DefiProvider.ShapeShift as const,
      tvl,
      type: DefiType.Staking as const,
      underlyingAssetId: rewardTokenAssetId,
      underlyingAssetIds: [tokenAssetId],
      underlyingAssetRatiosBaseUnit: [
        bn(1).times(bn(10).pow(underlyingAsset.precision)).toString(),
      ],
      name: underlyingAsset.symbol,
      rewardAssetIds: [],
      isClaimableRewards: true,
      expired: true,
    }
  }

  const data = {
    byId: stakingOpportunitiesById,
    type: defiType,
  }

  return { data }
}

export const foxyStakingOpportunitiesUserDataResolver = async ({
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
    const balance = selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter)

    const asset = selectAssetById(state, foxyAssetId)
    if (!asset) continue

    const toAssetIdParts: ToAssetIdArgs = {
      assetNamespace: fromAssetId(stakingOpportunityId).assetNamespace,
      assetReference: fromAssetId(stakingOpportunityId).assetReference,
      chainId: fromAssetId(stakingOpportunityId).chainId,
    }
    const opportunityId = toOpportunityId(toAssetIdParts)
    const userStakingId = serializeUserStakingId(accountId, opportunityId)

    const opportunities = await foxyInvestor.getFoxyOpportunities()

    // investor-foxy is architected around many FOXy addresses/opportunity, but akchually there's only one
    if (!opportunities[0]) continue

    const opportunity = opportunities[0]

    // FOXy is a rebasing token so there aren't rewards in the sense of rewards claim
    // These technically exist and are effectively accrued, but we're unable to derive them
    const rewardsAmountsCryptoBaseUnit = ['0'] as [string] | [string, string]

    const bip44Params = selectBip44ParamsByAccountId(state, { accountId })

    if (!bip44Params) continue

    const withdrawInfo = await foxyInvestor.getWithdrawInfo({
      contractAddress: opportunity.contractAddress,
      userAddress: fromAccountId(accountId).account,
      bip44Params,
    })

    const undelegations = [
      {
        completionTime: dayjs(withdrawInfo.releaseTime).unix(),
        undelegationAmountCryptoBaseUnit: bnOrZero(withdrawInfo.amount).toFixed(),
      },
    ]

    stakingOpportunitiesUserDataByUserStakingId[userStakingId] = {
      isLoaded: true,
      userStakingId,
      stakedAmountCryptoBaseUnit: balance,
      rewardsCryptoBaseUnit: { amounts: rewardsAmountsCryptoBaseUnit, claimable: true },
      undelegations,
    }
  }

  const data = {
    byId: stakingOpportunitiesUserDataByUserStakingId,
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
