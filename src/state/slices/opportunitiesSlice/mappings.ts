import {
  avalancheChainId,
  bchChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  ltcChainId,
} from '@shapeshiftoss/caip'

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
  thorchainSaversOpportunityIdsResolver,
  thorchainSaversStakingOpportunitiesMetadataResolver,
  thorchainSaversStakingOpportunitiesUserDataResolver,
} from './resolvers/thorchainsavers'
import {
  uniV2LpLpOpportunityIdsResolver,
  uniV2LpOpportunitiesMetadataResolver,
  uniV2LpUserDataResolver,
} from './resolvers/uniV2'
import type {
  DefiProviderToMetadataResolver,
  DefiProviderToOpportunitiesMetadataResolver,
  DefiProviderToOpportunitiesUserDataResolver,
  DefiProviderToOpportunityIdsResolver,
  DefiProviderToOpportunityUserDataResolver,
} from './types'
import { DefiProvider, DefiType } from './types'

export const DefiProviderToMetadataResolverByDeFiType: DefiProviderToMetadataResolver = {
  [`${DefiProvider.EthFoxStaking}`]: {
    [`${DefiType.Staking}`]: ethFoxStakingMetadataResolver,
  },
}

export const DefiProviderToOpportunitiesMetadataResolverByDeFiType: DefiProviderToOpportunitiesMetadataResolver =
  {
    [`${DefiProvider.UniV2}`]: {
      [`${DefiType.LiquidityPool}`]: uniV2LpOpportunitiesMetadataResolver,
    },
    [`${DefiProvider.Idle}`]: {
      [`${DefiType.Staking}`]: idleStakingOpportunitiesMetadataResolver,
    },
    [`${DefiProvider.CosmosSdk}`]: {
      [`${DefiType.Staking}`]: cosmosSdkStakingOpportunitiesMetadataResolver,
    },
    [`${DefiProvider.ThorchainSavers}`]: {
      [`${DefiType.Staking}`]: thorchainSaversStakingOpportunitiesMetadataResolver,
    },
    [`${DefiProvider.ShapeShift}`]: {
      [`${DefiType.Staking}`]: foxyStakingOpportunitiesMetadataResolver,
    },
  }

export const DefiProviderToOpportunitiesUserDataResolverByDeFiType: DefiProviderToOpportunitiesUserDataResolver =
  {
    [`${DefiProvider.Idle}`]: {
      [`${DefiType.Staking}`]: idleStakingOpportunitiesUserDataResolver,
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

export const DefiProviderToOpportunityIdsResolverByDeFiType: DefiProviderToOpportunityIdsResolver =
  {
    [`${DefiProvider.UniV2}`]: {
      [`${DefiType.LiquidityPool}`]: uniV2LpLpOpportunityIdsResolver,
    },
    [`${DefiProvider.EthFoxStaking}`]: {
      [`${DefiType.Staking}`]: ethFoxStakingOpportunityIdsResolver,
    },
    [`${DefiProvider.Idle}`]: {
      [`${DefiType.Staking}`]: idleStakingOpportunityIdsResolver,
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

export const DefiProviderToUserDataResolverByDeFiType: DefiProviderToOpportunityUserDataResolver = {
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
}

export const getMetadataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) => {
  const resolversByType = DefiProviderToMetadataResolverByDeFiType[defiProvider]
  const resolver = resolversByType?.[defiType]
  return resolver
}

export const getOpportunitiesMetadataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) => {
  const resolversByType = DefiProviderToOpportunitiesMetadataResolverByDeFiType[defiProvider]
  const resolver = resolversByType?.[defiType]
  return resolver
}

export const getUserDataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) => {
  const resolversByType = DefiProviderToUserDataResolverByDeFiType[defiProvider]
  const resolver = resolversByType?.[defiType]
  return resolver
}

export const getOpportunitiesUserDataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) => {
  const resolversByType = DefiProviderToOpportunitiesUserDataResolverByDeFiType[defiProvider]
  const resolver = resolversByType?.[defiType]
  return resolver
}

export const getOpportunityIdsResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) => {
  const resolversByType = DefiProviderToOpportunityIdsResolverByDeFiType[defiProvider]
  const resolver = resolversByType?.[defiType]
  return resolver
}
