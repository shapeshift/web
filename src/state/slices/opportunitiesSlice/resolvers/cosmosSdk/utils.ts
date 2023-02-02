import type { Account, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
import flatMapDeep from 'lodash/flatMapDeep'
import uniq from 'lodash/uniq'
import { isSome } from 'lib/utils'

import type { ValidatorId } from '../../types'
import { toValidatorId } from '../../utils'

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
