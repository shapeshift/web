import type { ChainId } from '@keepkey/caip'
import type { ChainAdapter } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import { PluginManager } from 'plugins'
import { activePlugins } from 'plugins/activePlugins'
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import type { Route } from 'Routes/helpers'
import { logger } from 'lib/logger'
import { partitionCompareWith } from 'lib/utils'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

import { getChainAdapterManager } from './chainAdapterSingleton'

type PluginProviderProps = {
  children: React.ReactNode
}

type PluginProviderContextProps = {
  pluginManager: PluginManager
  plugins: string[]
  supportedChains: ChainId[]
  routes: Route[]
}

const PluginContext = createContext<PluginProviderContextProps>({
  pluginManager: {} as PluginManager,
  plugins: [],
  supportedChains: [],
  routes: [],
})

const moduleLogger = logger.child({ namespace: ['PluginProvider'] })

export const PluginProvider = ({ children }: PluginProviderProps): JSX.Element => {
  const [supportedChains, setSupportedChains] = useState<ChainId[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const featureFlags = useSelector(selectFeatureFlags)

  const pluginManagerRef = useRef<PluginManager>(new PluginManager())
  const pluginManager = useMemo(() => pluginManagerRef.current, [pluginManagerRef])

  const chainAdapterManager = getChainAdapterManager()

  const plugins = useMemo(() => {
    moduleLogger.debug({ existingPlugins: pluginManager.keys() }, 'Plugin Registration Starting...')
    pluginManager.clear()

    for (const plugin of activePlugins) {
      try {
        pluginManager.register(plugin())
      } catch (e) {
        moduleLogger.error(e, { fn: 'register', plugin }, 'Register Plugins')
      }
    }

    moduleLogger.debug({ plugins: pluginManager.keys() }, 'Plugins Registration Completed')

    return pluginManager.keys()
  }, [pluginManager])

  useEffect(() => {
    if (!plugins) return

    const fnLogger = moduleLogger.child({ namespace: ['onFeatureFlags'] })
    fnLogger.trace('Activating plugins...')
    let pluginRoutes: Route[] = []

    // newly registered will be default + what comes from plugins
    const newChainAdapters: { [k in ChainId]?: () => ChainAdapter<ChainId> } = {}

    // register providers from each plugin
    for (const [, plugin] of pluginManager.entries()) {
      fnLogger.trace({ plugin }, 'Checking Plugin...')
      // Ignore plugins that have their feature flag disabled
      // If no featureFlag is present, then we assume it's enabled
      if (!plugin.featureFlag || featureFlags[plugin.featureFlag]) {
        // Call the optional `onLoad` callback
        plugin.onLoad?.()
        // Add optional routes
        if (plugin.routes) {
          pluginRoutes = pluginRoutes.concat(plugin.routes)
          fnLogger.trace({ plugin: plugin.name }, 'Added Routes')
        }

        // chain adapters providers
        plugin.providers?.chainAdapters?.forEach(([chain, factory]) => {
          // track newly registered adapters by plugins
          newChainAdapters[chain] = factory
          fnLogger.trace({ plugin: plugin.name, chain }, 'Added ChainAdapter')
        })
      }
    }

    // unregister the difference between what we had, and now have after loading plugins
    partitionCompareWith<ChainId>(
      [...chainAdapterManager.keys()],
      Object.keys(newChainAdapters) as ChainId[],
      {
        add: chainId => {
          const factory = newChainAdapters[chainId]
          if (factory) {
            getChainAdapterManager().set(chainId, factory())
            fnLogger.debug({ chainId, fn: 'partitionCompareWith' }, 'Added ChainAdapter')
          }
        },
        remove: chainId => {
          fnLogger.trace({ chainId, fn: 'partitionCompareWith' }, 'Removing ChainAdapter')
          getChainAdapterManager().delete(chainId)
          getChainAdapterManager().get(chainId)?.closeTxs()
          fnLogger.debug({ chainId, fn: 'partitionCompareWith' }, 'Removed ChainAdapter')
        },
      },
    )

    setRoutes(pluginRoutes)

    const _supportedChains = Object.values<ChainId>(KnownChainIds).filter(chainId => {
      if (!featureFlags.Osmosis && chainId === KnownChainIds.OsmosisMainnet) return false
      if (!featureFlags.Thorchain && chainId === KnownChainIds.ThorchainMainnet) return false
      return true
    })

    moduleLogger.trace({ supportedChains: _supportedChains }, 'Setting supportedChains')
    setSupportedChains(_supportedChains)
  }, [chainAdapterManager, featureFlags, pluginManager, plugins])

  if (!plugins) return <></>

  const values = {
    plugins,
    pluginManager,
    chainAdapterManager,
    supportedChains,
    routes,
  }

  moduleLogger.trace(values, 'Render')
  return <PluginContext.Provider value={values}>{children}</PluginContext.Provider>
}

export const usePlugins = () => useContext(PluginContext)
