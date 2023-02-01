import type { Account, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import { isSome } from 'lib/utils'

import type { StakingId } from '../../types'
import { toOpportunityAccountId } from '../../utils'

export const makeUniqueValidatorAccountIds = (
  cosmosAccounts: Account<CosmosSdkChainId>[],
): StakingId[] =>
  cosmosAccounts
    .map(cosmosAccount => {
      return Array.from(
        new Set(
          [
            cosmosAccount.chainSpecific.delegations.map(delegation =>
              toOpportunityAccountId({
                account: delegation.validator.address,
                chainId: cosmosAccount.chainId,
              }),
            ),
            cosmosAccount.chainSpecific.undelegations
              .map(undelegation =>
                toOpportunityAccountId({
                  account: undelegation.validator.address,
                  chainId: cosmosAccount.chainId,
                }),
              )
              .filter(isSome),
            cosmosAccount.chainSpecific.rewards.map(reward =>
              toOpportunityAccountId({
                account: reward.validator.address,
                chainId: cosmosAccount.chainId,
              }),
            ),
          ].flat(),
        ),
      )
    })
    .flat()
