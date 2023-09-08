import React, { useMemo } from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'

import { DefiModal } from '../../components/DefiModal/DefiModal'
import type {
  DefiManagerContextProps,
  DefiManagerProviderProps,
  DefiParams,
  DefiQueryParams,
} from './DefiCommon'
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
    if (!provider) return null

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
      {children}
      {provider && renderModules}
    </DefiManagerContext.Provider>
  )
}
