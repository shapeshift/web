import type { AccountId } from '@shapeshiftoss/caip'
import { toAccountId, toAssetId } from '@shapeshiftoss/caip'

import { STAKING_ID_DELIMITER } from './constants'
import type { OpportunityId, StakingId, UserStakingId, ValidatorId } from './types'

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
