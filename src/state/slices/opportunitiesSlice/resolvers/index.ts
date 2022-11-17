import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

import {
  foxFarmingLpMetadataResolver,
  foxFarmingLpOpportunityIdsResolver,
  foxFarmingLpUserDataResolver,
  foxFarmingStakingMetadataResolver,
  foxFarmingStakingOpportunityIdsResolver,
  foxFarmingStakingUserDataResolver,
} from './foxFarming'
import { idleStakingOpportunitiesMetadataResolver, idleStakingOpportunityIdsResolver } from './idle'

export const DefiProviderToMetadataResolverByDeFiType = {
  [`${DefiProvider.FoxFarming}`]: {
    [`${DefiType.LiquidityPool}`]: foxFarmingLpMetadataResolver,
    [`${DefiType.Staking}`]: foxFarmingStakingMetadataResolver,
  },
}

export const DefiProviderToOpportunitiesMetadataResolverByDeFiType = {
  [`${DefiProvider.Idle}`]: {
    [`${DefiType.Staking}`]: idleStakingOpportunitiesMetadataResolver,
  },
}

export const DefiProviderToOpportunityIdsResolverByDeFiType = {
  [`${DefiProvider.FoxFarming}`]: {
    [`${DefiType.LiquidityPool}`]: foxFarmingLpOpportunityIdsResolver,
    [`${DefiType.Staking}`]: foxFarmingStakingOpportunityIdsResolver,
  },
  [`${DefiProvider.Idle}`]: {
    [`${DefiType.Staking}`]: idleStakingOpportunityIdsResolver,
  },
}

export const DefiProviderToUserDataResolverByDeFiType = {
  [`${DefiProvider.FoxFarming}`]: {
    [`${DefiType.LiquidityPool}`]: foxFarmingLpUserDataResolver,
    [`${DefiType.Staking}`]: foxFarmingStakingUserDataResolver,
  },
}
