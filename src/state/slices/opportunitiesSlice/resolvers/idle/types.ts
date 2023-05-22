import type { DefiProvider, OpportunityMetadataBase } from '../../types'

export type IdleStakingSpecificMetadata = OpportunityMetadataBase & {
  // Idle tranches interact with a so-called "CDO" contract, which is different for each opportunity
  // "Best Yield" opportunities are different, as they simply interact with one of the two Idle proxy contracts, i.e the same two contracts for all "Best Yield" opportunities
  cdoAddress: string
  provider: DefiProvider.Idle
}
