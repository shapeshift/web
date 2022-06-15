import { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapter, ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Plugin, PluginManager } from 'plugins'
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Route } from 'Routes/helpers'
import { logger } from 'lib/logger'
import { partitionCompareWith } from 'lib/utils'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

type PluginProviderProps = {
  children: React.ReactNode
}

type PluginProviderContextProps = {
  pluginManager: PluginManager
  plugins: [string, Plugin][]
  chainAdapterManager: ChainAdapterManager
  supportedChains: ChainId[]
  routes: Route[]
}

const activePlugins = ['bitcoin', 'cosmos', 'ethereum', 'foxPage', 'osmosis']

// don't export me, access me through the getter
let _chainAdapterManager: ChainAdapterManager | undefined

// we need to be able to access this outside react
export const getChainAdapters = (): ChainAdapterManager => {
  if (!_chainAdapterManager) _chainAdapterManager = new Map()
  return _chainAdapterManager
}

const PluginContext = createContext<PluginProviderContextProps>({
  pluginManager: {} as PluginManager,
  plugins: [],
  chainAdapterManager: getChainAdapters(),
  supportedChains: [],
  routes: [],
})

const moduleLogger = logger.child({ namespace: ['PluginProvider'] })

export const PluginProvider = ({ children }: PluginProviderProps): JSX.Element => {
  const [pluginManager] = useState(new PluginManager())
  const [plugins, setPlugins] = useState<[string, Plugin][] | null>(null)
  const [supportedChains, setSupportedChains] = useState<ChainId[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const featureFlags = useSelector(selectFeatureFlags)

  // a referentially stable, reactive reference to the chain adapter manager singleton
  const chainAdapterManagerRef = useRef<ChainAdapterManager>(getChainAdapters())

  // a memoized version of the current version of the ref to be made available on the context
  const chainAdapterManager = useMemo(
    () => chainAdapterManagerRef.current,
    [chainAdapterManagerRef],
  )

  useEffect(() => {
    ;(async () => {
      pluginManager.clear()

      for (const plugin of activePlugins) {
        try {
          pluginManager.register(await import(`../../plugins/${plugin}/index.tsx`))
        } catch (e) {
          moduleLogger.error(e, { fn: 'register' }, 'Register Plugins')
        }
      }

      const plugins = pluginManager.entries()
      setPlugins(plugins)
      moduleLogger.debug({ plugins }, 'Plugins Registration Completed')
    })()
  }, [pluginManager])

  useEffect(() => {
    if (!plugins) return

    const fnLogger = moduleLogger.child({ namespace: ['onFeatureFlags'] })
    let pluginRoutes: Route[] = []

    // newly registered will be default + what comes from plugins
    const newChainAdapters: { [k in ChainId]?: () => ChainAdapter<ChainId> } = {}

    // register providers from each plugin
    for (const [, plugin] of pluginManager.entries()) {
      fnLogger.trace({ plugin }, 'Checking Plugin...')
      // Ignore plugins that have their feature flag disabled
      // If no featureFlag is present, then we assume it's enabled
      if (!plugin.featureFlag || featureFlags[plugin.featureFlag]) {
        // routes providers
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
      Object.keys(KnownChainIds) as ChainId[],
      Object.keys(newChainAdapters) as ChainId[],
      {
        add: chainId => {
          const factory = newChainAdapters[chainId]
          if (factory) {
            _chainAdapterManager?.set(chainId, factory())
            moduleLogger.debug({ chainId, fn: 'partitionCompareWith' }, 'Added ChainAdapter')
          }
        },
        remove: chainId => {
          moduleLogger.trace({ chainId, fn: 'partitionCompareWith' }, 'Closing Subscriptions')
          _chainAdapterManager?.delete(chainId)
          _chainAdapterManager?.get(chainId)?.closeTxs()
          moduleLogger.debug({ chainId, fn: 'partitionCompareWith' }, 'Removed ChainAdapter')
        },
      },
    )

    setRoutes(pluginRoutes)
    const knownChainIds = featureFlags.Osmosis
      ? Object.values(KnownChainIds)
      : Object.values(KnownChainIds).filter(chainId => chainId !== KnownChainIds.OsmosisMainnet)

    const _supportedChains = Object.values(knownChainIds) as ChainId[]
    moduleLogger.trace({ supportedChains: _supportedChains }, 'Setting supportedChains')
    setSupportedChains(_supportedChains)
  }, [chainAdapterManager, featureFlags, plugins, pluginManager])

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
export const useChainAdapters = () => {
  const context = useContext(PluginContext)
  if (!context) {
    throw new Error('PluginProvider: trying to access useChainAdapters outside the PluginProvider')
  }
  return context.chainAdapterManager
}
