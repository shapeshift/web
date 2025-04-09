import { CosmosManager } from '@/features/defi/providers/cosmos/components/CosmosManager/CosmosManager'
import { FoxFarmingManager } from '@/features/defi/providers/fox-farming/components/FoxFarmingManager/FoxFarmingManager'
import { FoxyManager } from '@/features/defi/providers/foxy/components/FoxyManager/FoxyManager'
import { ThorchainSaversManager } from '@/features/defi/providers/thorchain-savers/components/ThorchainSaversManager/ThorchainSaversManager'
import { DefiProvider, DefiType } from '@/state/slices/opportunitiesSlice/types'

export const DefiProviderToDefiModuleResolverByDeFiType = {
  [`${DefiProvider.EthFoxStaking}`]: {
    [`${DefiType.Staking}`]: FoxFarmingManager,
  },
  [`${DefiProvider.rFOX}`]: {
    [`${DefiType.Staking}`]: FoxFarmingManager,
  },
  [DefiProvider.ThorchainSavers]: {
    [`${DefiType.Staking}`]: ThorchainSaversManager,
  },
  [DefiProvider.ShapeShift]: FoxyManager,
  [DefiProvider.CosmosSdk]: CosmosManager,
}
// Not curried since we can either have a list of providers by DefiType, or a single one for providers not yet migrated to the abstraction
export const getDefiProviderModulesResolvers = (defiProvider: DefiProvider) =>
  DefiProviderToDefiModuleResolverByDeFiType[defiProvider]
