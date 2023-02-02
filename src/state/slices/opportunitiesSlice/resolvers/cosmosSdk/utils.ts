import { fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import type { Account, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import flatMapDeep from 'lodash/flatMapDeep'
import groupBy from 'lodash/groupBy'
import uniq from 'lodash/uniq'
import { isSome } from 'lib/utils'

import type {
  OpportunitiesState,
  UserStakingId,
  UserStakingOpportunity,
  ValidatorId,
} from '../../types'
import { serializeUserStakingId, toValidatorId } from '../../utils'

export const makeUniqueValidatorAccountIds = (
  cosmosAccounts: Account<CosmosSdkChainId>[],
): ValidatorId[] =>
  uniq(
    flatMapDeep(cosmosAccounts, cosmosAccount => [
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
  )

export const makeAccountUserData = ({
  cosmosAccount,
  validatorIds,
}: {
  cosmosAccount: Account<CosmosSdkChainId>
  validatorIds: ValidatorId[]
}): OpportunitiesState['userStaking']['byId'] => {
  const delegations = cosmosAccount.chainSpecific.delegations
  const undelegations = cosmosAccount.chainSpecific.delegations
  const rewards = cosmosAccount.chainSpecific.delegations

  const delegationsByValidator = groupBy(delegations, delegation => delegation.validator.address)
  const undelegationsByValidator = groupBy(
    undelegations,
    undelegation => undelegation.validator.address,
  )
  const rewardsByValidator = groupBy(rewards, reward => reward.validator.address)

  debugger
  return validatorIds.reduce((acc, validatorId) => {
    debugger
    const validatorAddress = fromAccountId(validatorId).account
    const userStakingId = serializeUserStakingId(
      toAccountId({ account: cosmosAccount.pubkey, chainId: cosmosAccount.chainId }),
      validatorId,
    )
    debugger

    acc[userStakingId] = {}
    return acc
  }, {} as Record<UserStakingId, UserStakingOpportunity>)

  // Use this to key by validatorId
  // const validatorId = toValidatorId(toValidatorIdParts)
}
