import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, fromAccountId, osmosisChainId, toAccountId } from '@shapeshiftoss/caip'
import type { Account, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import type { MarketData } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import flatMapDeep from 'lodash/flatMapDeep'
import groupBy from 'lodash/groupBy'
import uniq from 'lodash/uniq'
import type { Asset } from 'lib/asset-service'
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
import { serializeUserStakingId, supportsUndelegations, toValidatorId } from '../../utils'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from './constants'
import type { UserUndelegation } from './types'

export const makeUniqueValidatorAccountIds = ({
  cosmosSdkAccounts,
  isOsmoStakingEnabled,
}: {
  cosmosSdkAccounts: Account<CosmosSdkChainId>[]
  isOsmoStakingEnabled: Boolean
}): ValidatorId[] =>
  uniq([
    toValidatorId({ account: SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS, chainId: cosmosChainId }),
    ...(isOsmoStakingEnabled
      ? [toValidatorId({ account: SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS, chainId: osmosisChainId })]
      : []),
    ...flatMapDeep(cosmosSdkAccounts, cosmosSdkAccount => [
      cosmosSdkAccount.chainSpecific.delegations.map(delegation =>
        toValidatorId({
          account: delegation.validator.address,
          chainId: cosmosSdkAccount.chainId,
        }),
      ),
      cosmosSdkAccount.chainSpecific.undelegations
        .map(undelegation =>
          toValidatorId({
            account: undelegation.validator.address,
            chainId: cosmosSdkAccount.chainId,
          }),
        )
        .filter(isSome),
      cosmosSdkAccount.chainSpecific.rewards.map(reward =>
        toValidatorId({
          account: reward.validator.address,
          chainId: cosmosSdkAccount.chainId,
        }),
      ),
    ]),
  ])

export const makeAccountUserData = ({
  cosmosSdkAccount,
  validatorIds,
  onInvalidate,
}: {
  cosmosSdkAccount: Account<CosmosSdkChainId>
  validatorIds: ValidatorId[]
  onInvalidate: (userStakingId: UserStakingId) => void
}): OpportunitiesState['userStaking']['byId'] => {
  const delegations = cosmosSdkAccount.chainSpecific.delegations
  const undelegations = cosmosSdkAccount.chainSpecific.undelegations
  const rewards = cosmosSdkAccount.chainSpecific.rewards

  const delegationsByValidator = groupBy(delegations, delegation => delegation.validator.address)
  const undelegationsByValidator = groupBy(
    undelegations,
    undelegation => undelegation.validator.address,
  )
  const rewardsByValidator = groupBy(rewards, reward => reward.validator.address)

  return validatorIds.reduce<Record<UserStakingId, UserStakingOpportunity>>((acc, validatorId) => {
    const validatorAddress = fromAccountId(validatorId).account
    const userStakingId = serializeUserStakingId(
      toAccountId({ account: cosmosSdkAccount.pubkey, chainId: cosmosSdkAccount.chainId }),
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
    const maybeValidatorUndelegations = (maybeValidatorUndelegationsEntries ?? [])
      .filter(undelegation => dayjs().isBefore(dayjs.unix(undelegation.completionTime)))
      .map(({ amount, completionTime }) => ({
        undelegationAmountCryptoBaseUnit: amount,
        completionTime,
      }))

    if (
      maybeValidatorDelegations.gt(0) ||
      maybeValidatorRewardsAggregated.gt(0) ||
      maybeValidatorUndelegations.length
    ) {
      acc[userStakingId] = {
        userStakingId,
        stakedAmountCryptoBaseUnit: maybeValidatorDelegations.toFixed(),
        rewardsCryptoBaseUnit: {
          amounts: [maybeValidatorRewardsAggregated.toFixed()],
          claimable: true,
        },
        undelegations: maybeValidatorUndelegations,
      }
    } else {
      // UserStakingOpportunity invalidation
      onInvalidate(userStakingId)
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
export const makeTotalCosmosSdkUndelegationsCryptoBaseUnit = (undelegations: UserUndelegation[]) =>
  undelegations.reduce((a, { undelegationAmountCryptoBaseUnit: b }) => a.plus(b), bn(0))

export const makeTotalCosmosSdkBondingsCryptoBaseUnit = (
  userStakingOpportunity: Partial<UserStakingOpportunity>,
): BN =>
  bnOrZero(userStakingOpportunity?.stakedAmountCryptoBaseUnit)
    .plus(userStakingOpportunity?.rewardsCryptoBaseUnit?.amounts[0] ?? 0)
    .plus(
      makeTotalCosmosSdkUndelegationsCryptoBaseUnit([
        ...(supportsUndelegations(userStakingOpportunity)
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

  const rewardsAmountFiatBalance = [
    ...(opportunity.rewardsCryptoBaseUnit?.amounts ?? []),
  ].reduce<BN>((acc, currentAmount, i) => {
    const rewardAssetId = opportunity?.rewardAssetIds?.[i] ?? ''
    const rewardAsset = assets[rewardAssetId]
    return acc.plus(
      bnOrZero(currentAmount)
        .times(marketData[rewardAssetId]?.price ?? '0')
        .div(bn(10).pow(rewardAsset?.precision ?? 1)),
    )
  }, bn(0))

  const undelegationsFiatBalance = makeTotalCosmosSdkUndelegationsCryptoBaseUnit([
    ...(supportsUndelegations(opportunity) ? opportunity.undelegations : []),
  ])
    .times(marketData[opportunity.assetId]?.price ?? '0')
    .div(bn(10).pow(asset?.precision ?? 1))

  return stakedAmountFiatBalance.plus(rewardsAmountFiatBalance).plus(undelegationsFiatBalance)
}
