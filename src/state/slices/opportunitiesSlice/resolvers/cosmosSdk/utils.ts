import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  cosmosChainId,
  fromAccountId,
  fromAssetId,
  osmosisChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
import type { Account, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import type { MarketData } from '@shapeshiftoss/types'
import flatMapDeep from 'lodash/flatMapDeep'
import flow from 'lodash/flow'
import groupBy from 'lodash/groupBy'
import uniq from 'lodash/uniq'
import type { BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'

import type {
  OpportunitiesState,
  StakingEarnOpportunityType,
  UserStakingId,
  UserStakingOpportunity,
  UserStakingOpportunityWithMetadata,
  ValidatorId,
} from '../../types'
import { serializeUserStakingId, toValidatorId } from '../../utils'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from './constants'
import type { CosmosSdkStakingSpecificUserStakingOpportunity, UserUndelegation } from './types'

export const makeUniqueValidatorAccountIds = (
  cosmosAccounts: Account<CosmosSdkChainId>[],
): ValidatorId[] =>
  uniq([
    toValidatorId({ account: SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS, chainId: cosmosChainId }),
    toValidatorId({ account: SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS, chainId: osmosisChainId }),
    ...flatMapDeep(cosmosAccounts, cosmosAccount => [
      cosmosAccount.chainSpecific.delegations.map(delegation =>
        toValidatorId({
          account: delegation.validator.address,
          chainId: cosmosAccount.chainId,
        }),
      ),
      cosmosAccount.chainSpecific.undelegations
        .map(undelegation =>
          toValidatorId({
            account: undelegation.validator.address,
            chainId: cosmosAccount.chainId,
          }),
        )
        .filter(isSome),
      cosmosAccount.chainSpecific.rewards.map(reward =>
        toValidatorId({
          account: reward.validator.address,
          chainId: cosmosAccount.chainId,
        }),
      ),
    ]),
  ])

export const makeAccountUserData = ({
  cosmosAccount,
  validatorIds,
}: {
  cosmosAccount: Account<CosmosSdkChainId>
  validatorIds: ValidatorId[]
}): OpportunitiesState['userStaking']['byId'] => {
  const delegations = cosmosAccount.chainSpecific.delegations
  const undelegations = cosmosAccount.chainSpecific.undelegations
  const rewards = cosmosAccount.chainSpecific.rewards

  const delegationsByValidator = groupBy(delegations, delegation => delegation.validator.address)
  const undelegationsByValidator = groupBy(
    undelegations,
    undelegation => undelegation.validator.address,
  )
  const rewardsByValidator = groupBy(rewards, reward => reward.validator.address)

  return validatorIds.reduce<Record<UserStakingId, UserStakingOpportunity>>((acc, validatorId) => {
    const validatorAddress = fromAccountId(validatorId).account
    const userStakingId = serializeUserStakingId(
      toAccountId({ account: cosmosAccount.pubkey, chainId: cosmosAccount.chainId }),
      validatorId,
    )

    const maybeValidatorDelegations = bnOrZero(
      delegationsByValidator[validatorAddress]?.[0]?.amount,
    )
    const maybeValidatorRewards = rewardsByValidator[validatorAddress]?.[0]?.rewards
    const maybeValidatorRewardsAggregated = (maybeValidatorRewards ?? []).reduce(
      (a, b) => a.plus(b.amount),
      bn(0),
    )

    const maybeValidatorUndelegationsEntries =
      undelegationsByValidator[validatorAddress]?.[0]?.entries
    const maybeValidatorUndelegations = (maybeValidatorUndelegationsEntries ?? []).map(
      ({ amount, completionTime }) => ({
        undelegationAmountCryptoBaseUnit: amount,
        completionTime,
      }),
    )

    if (
      maybeValidatorDelegations.gt(0) ||
      maybeValidatorRewardsAggregated.gt(0) ||
      maybeValidatorUndelegations.length
    ) {
      acc[userStakingId] = {
        stakedAmountCryptoBaseUnit: maybeValidatorDelegations.toFixed(),
        rewardsAmountsCryptoBaseUnit: [maybeValidatorRewardsAggregated.toFixed()],
        undelegations: maybeValidatorUndelegations,
      }
    }

    return acc
  }, {})
}

export const getDefaultValidatorAddressFromChainId = (chainId: ChainId) => {
  switch (chainId) {
    case cosmosChainId:
      return SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS
    case osmosisChainId:
      return SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS
    default:
      throw new Error(`chainId ${chainId} is not a valid Cosmos SDK chainId`)
  }
}
export const getDefaultValidatorAddressFromAssetId = flow([
  (assetId: AssetId) => fromAssetId(assetId).chainId,
  getDefaultValidatorAddressFromChainId,
])

export const getDefaultValidatorAddressFromAccountId = flow(
  (accountId: AccountId) => fromAccountId(accountId).chainId,
  getDefaultValidatorAddressFromChainId,
)

export const isCosmosUserStaking = (
  userStakingOpportunity: Partial<UserStakingOpportunity>,
): userStakingOpportunity is CosmosSdkStakingSpecificUserStakingOpportunity =>
  'undelegations' in userStakingOpportunity

export const makeTotalCosmosSdkUndelegationsCryptoBaseUnit = (undelegations: UserUndelegation[]) =>
  undelegations.reduce((a, { undelegationAmountCryptoBaseUnit: b }) => a.plus(b), bn(0))

export const makeTotalCosmosSdkBondingsCryptoBaseUnit = (
  userStakingOpportunity: Partial<UserStakingOpportunity>,
): BN =>
  bnOrZero(userStakingOpportunity?.stakedAmountCryptoBaseUnit)
    .plus(userStakingOpportunity?.rewardsAmountsCryptoBaseUnit?.[0] ?? 0)
    .plus(
      makeTotalCosmosSdkUndelegationsCryptoBaseUnit([
        ...(isCosmosUserStaking(userStakingOpportunity)
          ? userStakingOpportunity.undelegations
          : []),
      ]),
    )

export const makeOpportunityTotalFiatBalance = ({
  opportunity,
  marketData,
  assets,
}: {
  opportunity: StakingEarnOpportunityType | UserStakingOpportunityWithMetadata
  marketData: Partial<Record<AssetId, MarketData>>
  assets: Partial<Record<AssetId, Asset>>
}): BN => {
  const asset = assets[opportunity.assetId]
  const underlyingAsset = assets[opportunity.underlyingAssetId]

  const stakedAmountFiatBalance = bnOrZero(opportunity.stakedAmountCryptoBaseUnit)
    .times(marketData[asset?.assetId ?? underlyingAsset?.assetId ?? '']?.price ?? '0')
    .div(bn(10).pow(asset?.precision ?? underlyingAsset?.precision ?? 1))

  const rewardsAmountFiatBalance = [...(opportunity.rewardsAmountsCryptoBaseUnit ?? [])].reduce<BN>(
    (acc, currentAmount, i) => {
      const rewardAssetId = opportunity?.rewardAssetIds?.[i] ?? ''
      const rewardAsset = assets[rewardAssetId]
      return acc.plus(
        bnOrZero(currentAmount)
          .times(marketData[rewardAssetId]?.price ?? '0')
          .div(bn(10).pow(rewardAsset?.precision ?? 1)),
      )
    },
    bn(0),
  )

  const undelegationsFiatBalance = makeTotalCosmosSdkUndelegationsCryptoBaseUnit([
    ...(isCosmosUserStaking(opportunity) ? opportunity.undelegations : []),
  ])
    .times(marketData[opportunity.assetId]?.price ?? '0')
    .div(bn(10).pow(asset?.precision ?? 1))

  return stakedAmountFiatBalance.plus(rewardsAmountFiatBalance).plus(undelegationsFiatBalance)
}
