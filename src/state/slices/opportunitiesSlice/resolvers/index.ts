import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'

import { foxFarmingLpMetadataResolver, foxFarmingLpUserDataResolver } from './foxfarming'

export const DefiProviderToMetadataResolverByDeFiType = {
  [`${DefiProvider.FoxFarming}`]: {
    [`${DefiType.LiquidityPool}`]: foxFarmingLpMetadataResolver,
  },
}

export const DefiProviderToUserDataResolverByDeFiType = {
  [`${DefiProvider.FoxFarming}`]: {
    [`${DefiType.LiquidityPool}`]: foxFarmingLpUserDataResolver,
  },
}
