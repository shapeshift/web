import { FoxyProvider } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { IdleProvider } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { YearnProvider } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { FoxEthLpManager } from 'features/defi/providers/fox-eth-lp/components/FoxEthLpManager/FoxEthLpManager'
import { FoxFarmingManager } from 'features/defi/providers/fox-farming/components/FoxFarmingManager/FoxFarmingManager'
import React, { useMemo } from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { DefiModal } from '../../components/DefiModal/DefiModal'
import { CosmosManager } from '../../providers/cosmos/components/CosmosManager/CosmosManager'
import { FoxyManager } from '../../providers/foxy/components/FoxyManager/FoxyManager'
import { IdleManager } from '../../providers/idle/components/IdleManager/IdleManager'
import { YearnManager } from '../../providers/yearn/components/YearnManager/YearnManager'
import type {
  DefiManagerContextProps,
  DefiManagerProviderProps,
  DefiParams,
  DefiQueryParams,
} from './DefiCommon'
import { DefiProvider } from './DefiCommon'

const DefiManagerContext = React.createContext<DefiManagerContextProps | null>(null)

const DefiModules = {
  [DefiProvider.Idle]: IdleManager,
  [DefiProvider.Yearn]: YearnManager,
  [DefiProvider.ShapeShift]: FoxyManager,
  [DefiProvider.FoxEthLP]: FoxEthLpManager,
  [DefiProvider.FoxFarming]: FoxFarmingManager,
  [DefiProvider.Cosmos]: CosmosManager,
  [DefiProvider.Osmosis]: CosmosManager,
}

/*
Cosmos modals are not part of this provider, those can be found under plugins/cosmos/components/modals.
Cosmos modals are opened via AllEarnOpportunities component (TODO : refactor the modals in order to use them in this file)
*/
export function DefiManagerProvider({ children }: DefiManagerProviderProps) {
  const modules = Object.keys(DefiModules)
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { provider } = query

  const renderModules = useMemo(() => {
    return modules.map(module => {
      const Module = DefiModules[module as DefiProvider]
      return (
        <DefiModal key={module} isOpen={provider === module}>
          <Module />
        </DefiModal>
      )
    })
  }, [modules, provider])

  return (
    <DefiManagerContext.Provider value={null}>
      <YearnProvider>
        <IdleProvider>
          <FoxyProvider>
            {children}
            {provider && renderModules}
          </FoxyProvider>
        </IdleProvider>
      </YearnProvider>
    </DefiManagerContext.Provider>
  )
}
