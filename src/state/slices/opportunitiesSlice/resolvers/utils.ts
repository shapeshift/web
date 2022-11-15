import type { Fetcher, Token } from '@uniswap/sdk'
import type { providers } from 'ethers'
import type { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import pipe from 'lodash/flow'
import memoize from 'lodash/memoize'
import { getEthersProvider } from 'plugins/foxPage/utils'

import {
  DefiProviderToMetadataResolverByDeFiType,
  DefiProviderToOpportunitiesMetadataResolverByDeFiType,
  DefiProviderToOpportunityIdsResolverByDeFiType,
  DefiProviderToUserDataResolverByDeFiType,
} from '.'

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

// mMany opportunity metadata resolvers
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

export const ethersProvider = getEthersProvider()

export const fetchPairData = memoize(
  (
    tokenA: Token,
    tokenB: Token,
    fetchPairData: typeof Fetcher['fetchPairData'],
    provider: providers.Web3Provider,
  ) => fetchPairData(tokenA, tokenB, provider),
)
