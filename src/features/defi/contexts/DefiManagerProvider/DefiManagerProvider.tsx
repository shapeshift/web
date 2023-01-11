import { FoxyProvider } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { IdleProvider } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { YearnProvider } from 'features/defi/contexts/YearnProvider/YearnProvider'
import React, { useMemo } from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { DefiModal } from '../../components/DefiModal/DefiModal'
import type {
  DefiManagerContextProps,
  DefiManagerProviderProps,
  DefiParams,
  DefiQueryParams,
} from './DefiCommon'
import { DefiProvider } from './DefiCommon'
import { getDefiProviderModulesResolvers } from './utils'

const DefiManagerContext = React.createContext<DefiManagerContextProps | null>(null)

/*
Cosmos modals are not part of this provider, those can be found under plugins/cosmos/components/modals.
Cosmos modals are opened via AllEarnOpportunities component (TODO : refactor the modals in order to use them in this file)
*/
export function DefiManagerProvider({ children }: DefiManagerProviderProps) {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { type, provider } = query

  const renderModules = useMemo(() => {
    return Object.values(DefiProvider).map(defiProvider => {
      const maybeModules = getDefiProviderModulesResolvers(provider as DefiProvider)

      if (typeof maybeModules === 'object')
        return Object.entries(maybeModules).map(([defiType, Module]) => (
          <DefiModal
            key={`${defiProvider}-${defiType}`}
            isOpen={provider === defiProvider && defiType === type}
          >
            <Module />
          </DefiModal>
        ))

      const Module = maybeModules

      return (
        <DefiModal key={defiProvider} isOpen={provider === defiProvider}>
          <Module />
        </DefiModal>
      )
    })
  }, [provider, type])

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
