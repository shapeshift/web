import type { UserStakingOpportunityBase } from '../../types'

type UserUndelegation = {
  completionTime: number
  undelegationAmountCryptoBaseUnit: string
}

export type CosmosSdkStakingSpecificUserStakingOpportunity = UserStakingOpportunityBase & {
  undelegations: UserUndelegation[]
}
