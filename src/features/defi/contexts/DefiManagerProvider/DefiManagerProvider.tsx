import { FoxyProvider } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { YearnProvider } from 'features/defi/contexts/YearnProvider/YearnProvider'
import React from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { DefiModal } from '../../components/DefiModal/DefiModal'
import { FoxyManager } from '../../providers/foxy/components/FoxyManager/FoxyManager'
import { YearnManager } from '../../providers/yearn/components/YearnManager/YearnManager'
import {
  DefiManagerContextProps,
  DefiManagerProviderProps,
  DefiParams,
  DefiProvider,
  DefiQueryParams,
} from './DefiCommon'

const DefiManagerContext = React.createContext<DefiManagerContextProps | null>(null)

const DefiModules = {
  [DefiProvider.Yearn]: YearnManager,
  [DefiProvider.ShapeShift]: FoxyManager,
}

/*
Cosmos modals are not part of this provider, those can be found under plugins/cosmos/components/modals.
Cosmos modals are opened via AllEarnOpportunities component (TODO : refactor the modals in order to use them in this file)
*/
export function DefiManagerProvider({ children }: DefiManagerProviderProps) {
  const Modules = Object.keys(DefiModules)
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { provider } = query

  return (
    <DefiManagerContext.Provider value={null}>
      <YearnProvider>
        <FoxyProvider>
          {children}
          {provider &&
            Modules.map(module => {
              const Module = DefiModules[module as DefiProvider]
              return (
                <DefiModal isOpen={provider === module}>
                  <Module />
                </DefiModal>
              )
            })}
        </FoxyProvider>
      </YearnProvider>
    </DefiManagerContext.Provider>
  )
}
