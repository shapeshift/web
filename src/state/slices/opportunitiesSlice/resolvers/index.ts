import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

import { foxFarmingLpMetadataResolver, foxFarmingLpUserDataResolver } from './foxfarming'
import type {
  IDefiProviderToMetadataResolverByDeFiType,
  IDefiProviderToUserDataResolverByDeFiType,
} from './types'

export const DefiProviderToMetadataResolverByDeFiType = {
  [DefiProvider.FoxFarming]: {
    [DefiType.LiquidityPool]: foxFarmingLpMetadataResolver,
  },
} as IDefiProviderToMetadataResolverByDeFiType

export const DefiProviderToUserDataResolverByDeFiType = {
  [DefiProvider.FoxFarming]: {
    [DefiType.LiquidityPool]: foxFarmingLpUserDataResolver,
  },
} as IDefiProviderToUserDataResolverByDeFiType
