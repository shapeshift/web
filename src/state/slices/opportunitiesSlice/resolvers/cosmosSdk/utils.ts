import { fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import type { Account, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import flatMapDeep from 'lodash/flatMapDeep'
import groupBy from 'lodash/groupBy'
import uniq from 'lodash/uniq'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
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
    const maybeValidatorUndelegations = maybeValidatorUndelegationsEntries?.map(
      ({ amount, completionTime }) => ({
        pendingUnstakedAmountCryptoBaseUnit: amount,
        completionTime,
      }),
    )

    if (
      maybeValidatorDelegations.gt(0) ||
      maybeValidatorRewardsAggregated.gt(0) ||
      maybeValidatorUndelegations?.length
    ) {
      acc[userStakingId] = {
        stakedAmountCryptoBaseUnit: maybeValidatorDelegations.toFixed(),
        rewardsAmountsCryptoBaseUnit: [maybeValidatorRewardsAggregated.toFixed()],
        unstakedAmounts: maybeValidatorUndelegations,
      }
    }

    return acc
  }, {})
}
