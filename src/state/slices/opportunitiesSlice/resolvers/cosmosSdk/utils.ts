import type { Account, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import { isSome } from 'lib/utils'

import type { StakingId } from '../../types'
import { toValidatorId } from '../../utils'

export const makeUniqueValidatorAccountIds = (
  cosmosAccounts: Account<CosmosSdkChainId>[],
): StakingId[] =>
  cosmosAccounts.flatMap(cosmosAccount => {
    return Array.from(
      new Set(
        [
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
        ].flat(),
      ),
    )
  })
