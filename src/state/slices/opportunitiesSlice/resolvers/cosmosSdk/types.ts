import type { UserStakingOpportunityBase } from '../../types'

export type UserUndelegation = {
  completionTime: number
  undelegationAmountCryptoBaseUnit: string
}

export type CosmosSdkStakingSpecificUserStakingOpportunity = UserStakingOpportunityBase & {
  undelegations: UserUndelegation[]
}
