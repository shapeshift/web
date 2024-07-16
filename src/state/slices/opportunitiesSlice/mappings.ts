import { KnownChainIds } from '@shapeshiftoss/types'
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
  rFOXStakingMetadataResolver,
  rFOXStakingOpportunityIdsResolver,
  rFOXStakingUserDataResolver,
} from './resolvers/rFOX'
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
  [`${DefiProvider.rFOX}`]: {
    [`${DefiType.Staking}`]: rFOXStakingMetadataResolver,
  },
}

export const DefiProviderToOpportunitiesMetadataResolverByDeFiType: DefiProviderToOpportunitiesMetadataResolver =
  {
    [`${DefiProvider.UniV2}`]: {
      [`${DefiType.LiquidityPool}`]: uniV2LpOpportunitiesMetadataResolver,
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
    [`${DefiProvider.rFOX}`]: {
      [`${DefiType.Staking}`]: rFOXStakingOpportunityIdsResolver,
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
  [`${DefiProvider.rFOX}`]: {
    [`${DefiType.Staking}`]: rFOXStakingUserDataResolver,
  },
}

export const CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES: Record<
  KnownChainIds,
  {
    defiProvider: DefiProvider
    defiType: DefiType
  }[]
> = {
  [KnownChainIds.AvalancheMainnet]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [KnownChainIds.LitecoinMainnet]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [KnownChainIds.BitcoinCashMainnet]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [KnownChainIds.DogecoinMainnet]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [KnownChainIds.BitcoinMainnet]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [KnownChainIds.EthereumMainnet]: [
    {
      defiProvider: DefiProvider.UniV2,
      defiType: DefiType.LiquidityPool,
    },
    {
      defiProvider: DefiProvider.EthFoxStaking,
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
  [KnownChainIds.BnbSmartChainMainnet]: [
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],

  [KnownChainIds.CosmosMainnet]: [
    {
      defiProvider: DefiProvider.CosmosSdk,
      defiType: DefiType.Staking,
    },
    {
      defiProvider: DefiProvider.ThorchainSavers,
      defiType: DefiType.Staking,
    },
  ],
  [KnownChainIds.OptimismMainnet]: [],
  [KnownChainIds.PolygonMainnet]: [],
  [KnownChainIds.GnosisMainnet]: [],
  [KnownChainIds.ThorchainMainnet]: [],
  [KnownChainIds.ArbitrumMainnet]: [
    {
      defiProvider: DefiProvider.rFOX,
      defiType: DefiType.Staking,
    },
  ],
  [KnownChainIds.ArbitrumNovaMainnet]: [],
  [KnownChainIds.BaseMainnet]: [],
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
