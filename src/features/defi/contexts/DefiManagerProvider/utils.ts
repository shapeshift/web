import { CosmosManager } from 'features/defi/providers/cosmos/components/CosmosManager/CosmosManager'
import { FoxFarmingManager } from 'features/defi/providers/fox-farming/components/FoxFarmingManager/FoxFarmingManager'
import { FoxyManager } from 'features/defi/providers/foxy/components/FoxyManager/FoxyManager'
import { IdleManager } from 'features/defi/providers/idle/components/IdleManager/IdleManager'
import { OsmosisManager } from 'features/defi/providers/osmosis/components/OsmosisManager/OsmosisManager'
import { ThorchainSaversManager } from 'features/defi/providers/thorchain-savers/components/ThorchainSaversManager/ThorchainSaversManager'
import { UniV2LpManager } from 'features/defi/providers/univ2/components/UniV2Manager/UniV2LpManager'
import { YearnManager } from 'features/defi/providers/yearn/components/YearnManager/YearnManager'

import { DefiProvider, DefiType } from './DefiCommon'

export const DefiProviderToDefiModuleResolverByDeFiType = {
  [`${DefiProvider.UniV2}`]: {
    [`${DefiType.LiquidityPool}`]: UniV2LpManager,
  },
  [`${DefiProvider.EthFoxStaking}`]: {
    [`${DefiType.Staking}`]: FoxFarmingManager,
  },
  [DefiProvider.Idle]: {
    [`${DefiType.Staking}`]: IdleManager,
  },
  [DefiProvider.Yearn]: {
    [`${DefiType.Staking}`]: YearnManager,
  },
  [DefiProvider.ThorchainSavers]: {
    [`${DefiType.Staking}`]: ThorchainSaversManager,
  },
  [DefiProvider.ShapeShift]: FoxyManager,
  [DefiProvider.CosmosSdk]: CosmosManager,
  [DefiProvider.OsmosisLp]: OsmosisManager,
}
// Not curried since we can either have a list of providers by DefiType, or a single one for providers not yet migrated to the abstraction
export const getDefiProviderModulesResolvers = (defiProvider: DefiProvider) =>
  DefiProviderToDefiModuleResolverByDeFiType[defiProvider]
