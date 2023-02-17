import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

import {
  cosmosSdkOpportunityIdsResolver,
  cosmosSdkStakingOpportunitiesMetadataResolver,
  cosmosSdkStakingOpportunitiesUserDataResolver,
} from './cosmosSdk'
import {
  ethFoxStakingMetadataResolver,
  ethFoxStakingOpportunityIdsResolver,
  ethFoxStakingUserDataResolver,
} from './ethFoxStaking'
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
  osmosisLpOpportunitiesMetadataResolver,
  osmosisLpOpportunityIdsResolver,
  osmosisLpUserDataResolver,
} from './osmosis'
import {
  thorchainSaversOpportunityIdsResolver,
  thorchainSaversStakingOpportunitiesMetadataResolver,
  thorchainSaversStakingOpportunitiesUserDataResolver,
} from './thorchainsavers'
import {
  uniV2LpLpOpportunityIdsResolver,
  uniV2LpMetadataResolver,
  uniV2LpUserDataResolver,
} from './uniV2'
import {
  yearnStakingOpportunitiesMetadataResolver,
  yearnStakingOpportunitiesUserDataResolver,
  yearnStakingOpportunityIdsResolver,
} from './yearn'

export const DefiProviderToMetadataResolverByDeFiType = {
  [`${DefiProvider.UniV2}`]: {
    [`${DefiType.LiquidityPool}`]: uniV2LpMetadataResolver,
  },
  [`${DefiProvider.EthFoxStaking}`]: {
    [`${DefiType.Staking}`]: ethFoxStakingMetadataResolver,
  },
}

export const DefiProviderToOpportunitiesMetadataResolverByDeFiType = {
  [`${DefiProvider.Idle}`]: {
    [`${DefiType.Staking}`]: idleStakingOpportunitiesMetadataResolver,
  },
  [`${DefiProvider.Cosmos}`]: {
    [`${DefiType.Staking}`]: cosmosSdkStakingOpportunitiesMetadataResolver,
  },
  [`${DefiProvider.Yearn}`]: {
    [`${DefiType.Staking}`]: yearnStakingOpportunitiesMetadataResolver,
  },
  [`${DefiProvider.Osmosis}`]: {
    [`${DefiType.LiquidityPool}`]: osmosisLpOpportunitiesMetadataResolver,
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
  [`${DefiProvider.ThorchainSavers}`]: {
    [`${DefiType.Staking}`]: thorchainSaversStakingOpportunitiesUserDataResolver,
  },
  [`${DefiProvider.Cosmos}`]: {
    [`${DefiType.Staking}`]: cosmosSdkStakingOpportunitiesUserDataResolver,
  },
}

export const DefiProviderToOpportunityIdsResolverByDeFiType = {
  [`${DefiProvider.UniV2}`]: {
    [`${DefiType.LiquidityPool}`]: uniV2LpLpOpportunityIdsResolver,
    [`${DefiType.Staking}`]: ethFoxStakingOpportunityIdsResolver,
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
  [`${DefiProvider.ThorchainSavers}`]: {
    [`${DefiType.Staking}`]: thorchainSaversOpportunityIdsResolver,
  },
  [`${DefiProvider.ShapeShift}`]: {
    [`${DefiType.Staking}`]: foxyStakingOpportunityIdsResolver,
  },
  [`${DefiProvider.Cosmos}`]: {
    [`${DefiType.Staking}`]: cosmosSdkOpportunityIdsResolver,
  },
}

export const DefiProviderToUserDataResolverByDeFiType = {
  [`${DefiProvider.UniV2}`]: {
    [`${DefiType.LiquidityPool}`]: uniV2LpUserDataResolver,
  },
  [`${DefiProvider.EthFoxStaking}`]: {
    [`${DefiType.Staking}`]: ethFoxStakingUserDataResolver,
  },
  [`${DefiProvider.Osmosis}`]: {
    [`${DefiType.LiquidityPool}`]: osmosisLpUserDataResolver,
  },
}
