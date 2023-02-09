import type { AccountId } from '@shapeshiftoss/caip'
import { toAccountId, toAssetId } from '@shapeshiftoss/caip'
import type { BN } from '@shapeshiftoss/investor-foxy'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { bn } from 'lib/bignumber/bignumber'

import { STAKING_ID_DELIMITER } from './constants'
import type {
  CosmosSdkStakingSpecificUserStakingOpportunity,
  UserUndelegation,
} from './resolvers/cosmosSdk/types'
import type {
  OpportunityId,
  StakingEarnOpportunityType,
  StakingId,
  UserStakingId,
  UserStakingOpportunity,
  UserStakingOpportunityWithMetadata,
  ValidatorId,
} from './types'

export type UserStakingIdParts = [accountId: AccountId, stakingId: StakingId]

export const deserializeUserStakingId = (userStakingId: UserStakingId): UserStakingIdParts => {
  const parts = userStakingId.split(STAKING_ID_DELIMITER)

  const [accountId, stakingId] = parts

  if (!(accountId && stakingId)) throw new Error('Error deserializing UserStakingId')

  return [accountId, stakingId]
}

export const serializeUserStakingId = (
  ...[accountId, stakingId]: UserStakingIdParts
): UserStakingId => `${accountId}${STAKING_ID_DELIMITER}${stakingId}`

export const filterUserStakingIdByStakingIdCompareFn = (
  userStakingId: UserStakingId,
  stakingId: StakingId,
) => {
  const parts = deserializeUserStakingId(userStakingId)
  const [, deserializedStakingId] = parts

  return deserializedStakingId === stakingId
}

// An OpportunityId as an AssetId, i.e any chain where the opportunity is an Asset
// That may be a L1 AssetId (THOR savers), or a smart contract account, which for all intent and purposes is an ERC20 i.e an asset
export const toOpportunityId = (...[args]: Parameters<typeof toAssetId>) =>
  toAssetId(args) as OpportunityId

// An OpportunityId as a ValidatorId
// Currently used with Cosmos SDK opportunities, where the opportunity is a validator, e.g an Address
// Since AccountId is generally used to represent portfolio accounts and not other, arbitrary on-chain accounts, we give this some flavour
export const toValidatorId = (...[args]: Parameters<typeof toAccountId>) =>
  toAccountId(args) as ValidatorId

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

export const isActiveOpportunity = (
  userStakingOpportunity: UserStakingOpportunity | UserStakingOpportunityWithMetadata,
) => {
  const hasActiveStaking = bn(userStakingOpportunity.stakedAmountCryptoBaseUnit).gt(0)
  const hasRewards = userStakingOpportunity.rewardsAmountsCryptoBaseUnit.some(rewardsAmount =>
    bn(rewardsAmount).gt(0),
  )
  // Defaults to 0 for non-Cosmos-Sdk opportunities
  const hasActiveUndelegations = makeTotalCosmosSdkUndelegationsCryptoBaseUnit([
    ...(isCosmosUserStaking(userStakingOpportunity) ? userStakingOpportunity.undelegations : []),
  ]).gt(0)

  return hasActiveStaking || hasRewards || hasActiveUndelegations
}

export const isActiveEarnOpportunity = (earnUserStakingOpportunity: StakingEarnOpportunityType) =>
  isActiveOpportunity(earnUserStakingOpportunity as UserStakingOpportunity)
