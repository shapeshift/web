import type { UserStakingOpportunityBase } from '../../types'

type UnstakedAmount = {
  completionTime: number
  undelegationAmountCryptoBaseUnit: string
}

export type CosmosSdkStakingSpecificUserStakingOpportunity = UserStakingOpportunityBase & {
  undelegations: UnstakedAmount[]
}
