import type { UserStakingOpportunityBase } from '../../types'

export type UserUndelegation = {
  completionTime: number
  undelegationAmountCryptoBaseUnit: string
}

export type FoxySpecificUserStakingOpportunity = UserStakingOpportunityBase & {
  // Undelegations is a Cosmos SDK specific terminology https://docs.cosmos.network/main/modules/staking
  // The terminology has been reused here for FOXy to keep things abstracted, but Cosmos SDK undelegations
  // and FOXy delayed withdraws are two very different implementations, on two different chains
  undelegations: UserUndelegation[]
}
