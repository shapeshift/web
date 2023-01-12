import type { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

import type { OpportunityMetadataBase } from '../../types'

export type ThorchainSaversStakingSpecificMetadata = OpportunityMetadataBase & {
  provider: DefiProvider.ThorchainSavers
  type: DefiType.Staking
  saversSupplyIncludeAccruedFiat: string
  saversMaxSupplyFiat: string
}
