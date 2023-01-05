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
  idleStakingOpportunitiesMetadataResolver,
  idleStakingOpportunitiesUserDataResolver,
  idleStakingOpportunityIdsResolver,
} from './idle'
import {
  osmosisLpOpportunitiesMetadataResolver,
  osmosisLpOpportunityIdsResolver,
  osmosisLpUserDataResolver,
} from './osmosis'
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
  [`${DefiProvider.Osmosis}`]: {
    [`${DefiType.LiquidityPool}`]: osmosisLpOpportunitiesMetadataResolver,
  },
}

export const DefiProviderToOpportunitiesUserDataResolverByDeFiType = {
  [`${DefiProvider.Idle}`]: {
    [`${DefiType.Staking}`]: idleStakingOpportunitiesUserDataResolver,
  },
  [`${DefiProvider.Yearn}`]: {
    [`${DefiType.Staking}`]: yearnStakingOpportunitiesUserDataResolver,
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
  [`${DefiProvider.Osmosis}`]: {
    [`${DefiType.LiquidityPool}`]: osmosisLpOpportunityIdsResolver,
  },
}

export const DefiProviderToUserDataResolverByDeFiType = {
  [`${DefiProvider.FoxFarming}`]: {
    [`${DefiType.LiquidityPool}`]: foxFarmingLpUserDataResolver,
    [`${DefiType.Staking}`]: foxFarmingStakingUserDataResolver,
  },
  [`${DefiProvider.Osmosis}`]: {
    [`${DefiType.LiquidityPool}`]: osmosisLpUserDataResolver,
  },
}
