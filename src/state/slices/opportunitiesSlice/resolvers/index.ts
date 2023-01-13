import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

import {
  foxFarmingLpMetadataResolver,
  foxFarmingLpOpportunityIdsResolver,
  foxFarmingLpUserDataResolver,
  foxFarmingStakingMetadataResolver,
  foxFarmingStakingOpportunityIdsResolver,
  foxFarmingStakingUserDataResolver,
} from './foxFarming'
import {
  foxyStakingOpportunitiesMetadataResolver,
  foxyStakingOpportunitiesUserDataResolver,
  foxyStakingOpportunityIdsResolver,
} from './foxy'
import {
  idleStakingOpportunitiesMetadataResolver,
  idleStakingOpportunitiesUserDataResolver,
  idleStakingOpportunityIdsResolver,
} from './idle'
import {
  thorchainSaversOpportunityIdsResolver,
  thorchainSaversStakingOpportunitiesMetadataResolver,
} from './thorchainsavers'
import {
  yearnStakingOpportunitiesMetadataResolver,
  yearnStakingOpportunitiesUserDataResolver,
  yearnStakingOpportunityIdsResolver,
} from './yearn'

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
  [`${DefiProvider.Yearn}`]: {
    [`${DefiType.Staking}`]: yearnStakingOpportunitiesMetadataResolver,
  },
  [`${DefiProvider.ThorchainSavers}`]: {
    [`${DefiType.Staking}`]: thorchainSaversStakingOpportunitiesMetadataResolver,
  },
  [`${DefiProvider.ShapeShift}`]: {
    [`${DefiType.Staking}`]: foxyStakingOpportunitiesMetadataResolver,
  },
}

export const DefiProviderToOpportunitiesUserDataResolverByDeFiType = {
  [`${DefiProvider.Idle}`]: {
    [`${DefiType.Staking}`]: idleStakingOpportunitiesUserDataResolver,
  },
  [`${DefiProvider.Yearn}`]: {
    [`${DefiType.Staking}`]: yearnStakingOpportunitiesUserDataResolver,
  },
  [`${DefiProvider.ShapeShift}`]: {
    [`${DefiType.Staking}`]: foxyStakingOpportunitiesUserDataResolver,
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
  [`${DefiProvider.Yearn}`]: {
    [`${DefiType.Staking}`]: yearnStakingOpportunityIdsResolver,
  },
  [`${DefiProvider.ThorchainSavers}`]: {
    [`${DefiType.Staking}`]: thorchainSaversOpportunityIdsResolver,
  },
  [`${DefiProvider.ShapeShift}`]: {
    [`${DefiType.Staking}`]: foxyStakingOpportunityIdsResolver,
  },
}

export const DefiProviderToUserDataResolverByDeFiType = {
  [`${DefiProvider.FoxFarming}`]: {
    [`${DefiType.LiquidityPool}`]: foxFarmingLpUserDataResolver,
    [`${DefiType.Staking}`]: foxFarmingStakingUserDataResolver,
  },
}
