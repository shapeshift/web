import { FoxyProvider } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { YearnProvider } from 'features/defi/contexts/YearnProvider/YearnProvider'
import React from 'react'
import { Route, useLocation } from 'react-router-dom'
import { NotFound } from 'pages/NotFound/NotFound'

import { DefiModal } from '../../components/DefiModal/DefiModal'
import { FoxyManager } from '../../providers/foxy/components/FoxyManager/FoxyManager'
import { YearnManager } from '../../providers/yearn/components/YearnManager/YearnManager'
import { DefiManagerContextProps, DefiManagerProviderProps, DefiProvider } from './DefiCommon'

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
  const location = useLocation<{ background: any }>()
  const background = location.state && location.state.background

  return (
    <DefiManagerContext.Provider value={null}>
      <YearnProvider>
        <FoxyProvider>
          {children}
          {background && (
            <Route
              path='/defi/:earnType/:provider'
              render={({ match: { params } }) => {
                const { provider } = params
                const Module = DefiModules[provider as DefiProvider]
                return <DefiModal>{Module ? <Module /> : <NotFound />}</DefiModal>
              }}
            />
          )}
        </FoxyProvider>
      </YearnProvider>
    </DefiManagerContext.Provider>
  )
}
