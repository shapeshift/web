import {
  avalancheChainId,
  bchChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  ltcChainId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import pipe from 'lodash/flow'

import {
  cosmosSdkOpportunityIdsResolver,
  cosmosSdkStakingOpportunitiesMetadataResolver,
  cosmosSdkStakingOpportunitiesUserDataResolver,
} from './resolvers/cosmosSdk'
import {
  ethFoxStakingMetadataResolver,
  ethFoxStakingOpportunityIdsResolver,
  ethFoxStakingUserDataResolver,
} from './resolvers/ethFoxStaking'
import {
  foxyStakingOpportunitiesMetadataResolver,
  foxyStakingOpportunitiesUserDataResolver,
  foxyStakingOpportunityIdsResolver,
} from './resolvers/foxy'
import {
  idleStakingOpportunitiesMetadataResolver,
  idleStakingOpportunitiesUserDataResolver,
  idleStakingOpportunityIdsResolver,
} from './resolvers/idle'
import {
  osmosisLpOpportunitiesMetadataResolver,
  osmosisLpOpportunityIdsResolver,
} from './resolvers/osmosis'
import {
  thorchainSaversOpportunityIdsResolver,
  thorchainSaversStakingOpportunitiesMetadataResolver,
  thorchainSaversStakingOpportunitiesUserDataResolver,
} from './resolvers/thorchainsavers'
import {
  uniV2LpLpOpportunityIdsResolver,
  uniV2LpOpportunitiesMetadataResolver,
  uniV2LpUserDataResolver,
} from './resolvers/uniV2'
import {
  yearnStakingOpportunitiesMetadataResolver,
  yearnStakingOpportunitiesUserDataResolver,
  yearnStakingOpportunityIdsResolver,
} from './resolvers/yearn'
import { DefiProvider, DefiType } from './types'

export const DefiProviderToMetadataResolverByDeFiType = {
  [`${DefiProvider.EthFoxStaking}`]: {
    [`${DefiType.Staking}`]: ethFoxStakingMetadataResolver,
  },
}

export const DefiProviderToOpportunitiesMetadataResolverByDeFiType = {
  [`${DefiProvider.UniV2}`]: {
    [`${DefiType.LiquidityPool}`]: uniV2LpOpportunitiesMetadataResolver,
  },
  [`${DefiProvider.Idle}`]: {
    [`${DefiType.Staking}`]: idleStakingOpportunitiesMetadataResolver,
  },
  [`${DefiProvider.CosmosSdk}`]: {
    [`${DefiType.Staking}`]: cosmosSdkStakingOpportunitiesMetadataResolver,
  },
  [`${DefiProvider.Yearn}`]: {
    [`${DefiType.Staking}`]: yearnStakingOpportunitiesMetadataResolver,
  },
  [`${DefiProvider.OsmosisLp}`]: {
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
  [`${DefiProvider.CosmosSdk}`]: {
    [`${DefiType.Staking}`]: cosmosSdkStakingOpportunitiesUserDataResolver,
  },
}

export const DefiProviderToOpportunityIdsResolverByDeFiType = {
  [`${DefiProvider.UniV2}`]: {
    [`${DefiType.LiquidityPool}`]: uniV2LpLpOpportunityIdsResolver,
  },
  [`${DefiProvider.EthFoxStaking}`]: {
    [`${DefiType.Staking}`]: ethFoxStakingOpportunityIdsResolver,
  },
  [`${DefiProvider.Idle}`]: {
    [`${DefiType.Staking}`]: idleStakingOpportunityIdsResolver,
  },
  [`${DefiProvider.Yearn}`]: {
    [`${DefiType.Staking}`]: yearnStakingOpportunityIdsResolver,
  },
  [`${DefiProvider.OsmosisLp}`]: {
    [`${DefiType.LiquidityPool}`]: osmosisLpOpportunityIdsResolver,
  },
  [`${DefiProvider.ThorchainSavers}`]: {
    [`${DefiType.Staking}`]: thorchainSaversOpportunityIdsResolver,
  },
  [`${DefiProvider.ShapeShift}`]: {
    [`${DefiType.Staking}`]: foxyStakingOpportunityIdsResolver,
  },
  [`${DefiProvider.CosmosSdk}`]: {
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
}

export const CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES = {
  [avalancheChainId]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [ltcChainId]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [bchChainId]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [dogeChainId]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [btcChainId]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [ethChainId]: [
    {
      defiProvider: DefiProvider.UniV2,
      defiType: DefiType.LiquidityPool,
    },
    {
      defiProvider: DefiProvider.EthFoxStaking,
      defiType: DefiType.Staking,
    },
    {
      defiProvider: DefiProvider.Idle,
      defiType: DefiType.Staking,
    },
    {
      defiProvider: DefiProvider.Yearn,
      defiType: DefiType.Staking,
    },
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
    {
      defiProvider: DefiProvider.ShapeShift,
      defiType: DefiType.Staking,
    },
  ],
  [cosmosChainId]: [
    {
      defiProvider: DefiProvider.CosmosSdk,
      defiType: DefiType.Staking,
    },
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [osmosisChainId]: [
    {
      defiProvider: DefiProvider.CosmosSdk,
      defiType: DefiType.Staking,
    },
    {
      defiProvider: DefiProvider.OsmosisLp,
      defiType: DefiType.LiquidityPool,
    },
  ],
}

// Single opportunity metadata resolvers
// "Give me the resolvers for a given DeFi provider"
export const getDefiProviderMetadataResolvers = (defiProvider: DefiProvider) =>
  DefiProviderToMetadataResolverByDeFiType[defiProvider]
// "Give me the resolvers for a given DeFi type"
export const getDefiTypeMetadataResolvers = (
  defiType: DefiType,
  resolversByType: ReturnType<typeof getDefiProviderMetadataResolvers>,
) => resolversByType?.[defiType]

export const getMetadataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) =>
  pipe(
    getDefiProviderMetadataResolvers,
    getDefiTypeMetadataResolvers.bind(this, defiType),
  )(defiProvider)

// Many opportunity metadata resolvers
// "Give me the resolvers for a given DeFi provider"
export const getDefiProviderOpportunitiesMetadataResolvers = (defiProvider: DefiProvider) =>
  DefiProviderToOpportunitiesMetadataResolverByDeFiType[defiProvider]
// "Give me the resolvers for a given DeFi type"
export const getDefiTypeOpportunitiesMetadataResolvers = (
  defiType: DefiType,
  resolversByType: ReturnType<typeof getDefiProviderOpportunitiesMetadataResolvers>,
) => resolversByType?.[defiType]

export const getOpportunitiesMetadataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) =>
  pipe(
    getDefiProviderOpportunitiesMetadataResolvers,
    getDefiTypeOpportunitiesMetadataResolvers.bind(this, defiType),
  )(defiProvider)

// "Give me the resolvers for a given DeFi provider"
export const getDefiProviderUserDataResolvers = (defiProvider: DefiProvider) =>
  DefiProviderToUserDataResolverByDeFiType[defiProvider]
// "Give me the resolvers for a given DeFi type"
export const getDefiTypeUserDataResolvers = (
  defiType: DefiType,
  resolversByType: ReturnType<typeof getDefiProviderUserDataResolvers>,
) => resolversByType?.[defiType]

export const getUserDataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) =>
  pipe(
    getDefiProviderUserDataResolvers,
    getDefiTypeUserDataResolvers.bind(this, defiType),
  )(defiProvider)

// "Give me the resolvers for a given DeFi provider"
export const getDefiProviderOpportunitiesUserDataResolvers = (defiProvider: DefiProvider) =>
  DefiProviderToOpportunitiesUserDataResolverByDeFiType[defiProvider]
// "Give me the resolvers for a given DeFi type"
export const getDefiTypeOpportunitiesUserDataResolvers = (
  defiType: DefiType,
  resolversByType: ReturnType<typeof getDefiProviderOpportunitiesUserDataResolvers>,
) => resolversByType?.[defiType]

export const getOpportunitiesUserDataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) =>
  pipe(
    getDefiProviderOpportunitiesUserDataResolvers,
    getDefiTypeOpportunitiesUserDataResolvers.bind(this, defiType),
  )(defiProvider)

// "Give me the resolvers for a given DeFi provider"
export const getDefiProviderOpportunityIdsResolvers = (defiProvider: DefiProvider) =>
  DefiProviderToOpportunityIdsResolverByDeFiType[defiProvider]

// "Give me the resolvers for a given DeFi type"
export const getDefiTypeOpportunityIdsResolvers = (
  defiType: DefiType,
  resolversByType: ReturnType<typeof getDefiProviderOpportunityIdsResolvers>,
) => resolversByType?.[defiType]

export const getOpportunityIdsResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) =>
  pipe(
    getDefiProviderOpportunityIdsResolvers,
    getDefiTypeOpportunityIdsResolvers.bind(this, defiType),
  )(defiProvider)
