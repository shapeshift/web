import type { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'

import {
  DefiProviderToMetadataResolverByDeFiType,
  DefiProviderToUserDataResolverByDeFiType,
} from '.'

// "Give me the resolvers for a given DeFi provider"
export const getDefiProviderMetadataResolvers = (defiProvider: DefiProvider) =>
  O.fromNullable(DefiProviderToMetadataResolverByDeFiType[defiProvider])
// "Give me the resolvers for a given DeFi type"
export const getDefiTypeMetadataResolvers = (
  defiType: DefiType,
  resolversByType: ReturnType<typeof getDefiProviderMetadataResolvers>,
) =>
  pipe(
    resolversByType,
    O.map(resolversByType => resolversByType[defiType]),
  )

export const getMetadataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) =>
  pipe(defiProvider, getDefiProviderMetadataResolvers, defiProviderMetadataResolvers =>
    getDefiTypeMetadataResolvers(defiType, defiProviderMetadataResolvers),
  )

// "Give me the resolvers for a given DeFi provider"
export const getDefiProviderUserDataResolvers = (defiProvider: DefiProvider) =>
  O.fromNullable(DefiProviderToUserDataResolverByDeFiType[defiProvider])
// "Give me the resolvers for a given DeFi type"
export const getDefiTypeUserDataResolvers = (
  defiType: DefiType,
  resolversByType: ReturnType<typeof getDefiProviderUserDataResolvers>,
) =>
  pipe(
    resolversByType,
    O.map(resolversByType => resolversByType[defiType]),
  )

export const getUserDataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) =>
  pipe(defiProvider, getDefiProviderUserDataResolvers, defiProviderUserDataResolvers =>
    getDefiTypeUserDataResolvers(defiType, defiProviderUserDataResolvers),
  )
