import type { UserStakingOpportunityBase } from '../../types'

type UnstakedAmount = {
  completionTime: number
  pendingUnstakedAmountCryptoBaseUnit: string
}

export type CosmosSdkStakingSpecificUserStakingOpportunity = UserStakingOpportunityBase & {
  unstakedAmounts: UnstakedAmount[]
}
