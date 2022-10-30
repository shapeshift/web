import type { BaseQueryApi } from '@reduxjs/toolkit/dist/query/baseQueryTypes'
import type { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

import type { foxFarmingLpMetadataResolver, foxFarmingLpUserDataResolver } from './foxfarming'

export type ReduxApi = Pick<BaseQueryApi, 'dispatch' | 'getState'>

export type IDefiProviderToMetadataResolverByDeFiType = {
  [key in DefiProvider]?: {
    // TODO: Discriminated union, only FOX ETH LP/Farming is implemented so far
    [key in DefiType]: typeof foxFarmingLpMetadataResolver
  }
}

export type IDefiProviderToUserDataResolverByDeFiType = {
  [key in DefiProvider]?: {
    // TODO: Discriminated union, only FOX ETH LP/Farming is implemented so far
    [key in DefiType]: typeof foxFarmingLpUserDataResolver
  }
}
