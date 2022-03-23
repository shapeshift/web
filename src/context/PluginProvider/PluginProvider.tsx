import { useState, useEffect, useContext } from 'react'
import { ChainTypes } from '@shapeshiftoss/types'
import { ChainAdapterManager, ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { PluginManager, Plugin } from 'plugins'
import React, { createContext } from 'react'
import { useSelector } from 'react-redux'
import { selectFeatureFlags } from 'state/slices/selectors'
import { Route } from 'Routes/helpers'
import { partitionCompareWith } from 'lib/utils'

type PluginProviderProps = {
  children: React.ReactNode
}

type PluginProviderContextProps = {
  pluginManager: PluginManager
  plugins: [string, Plugin][]
  chainAdapterManager: ChainAdapterManager
  supportedChains: ChainTypes[]
}

const activePlugins = ['bitcoin', 'cosmos', 'ethereum']

const PluginContext = createContext<PluginProviderContextProps | null>(null)

export const chainAdapterManager = new ChainAdapterManager({})

export const PluginProvider = ({ children }: PluginProviderProps): JSX.Element => {
  const [pluginManager] = useState(new PluginManager())
  const [plugins, setPlugins] = useState<[string, Plugin][] | null>(null)
  const [supportedChains, setSupportedChains] = useState<ChainTypes[]>([])
  const featureFlags = useSelector(selectFeatureFlags)

  useEffect(() => {
    ;(async () => {
      try {
        pluginManager.clear()

        for (const plugin of activePlugins) {
          pluginManager.register(await import(`../../plugins/${plugin}/index.tsx`))
        }

        setPlugins(pluginManager.entries())
      } catch (err) {
        // TODO(ryankk): show a global error screen in the future??
        console.error('PluginProvider:', err)
      }
    })()
  }, [pluginManager])

  useEffect(() => {
    if (!plugins) return

    let routes: Route[] = []
    // keep track of what's currently registered
    const currentChainAdapters = chainAdapterManager.getSupportedChains()

    // newly registered will be default + what comes from plugins
    const newChainAdapters: { [k in ChainTypes]?: () => ChainAdapter<ChainTypes> } = {}

    // register providers from each plugin
    for (const [, plugin] of pluginManager.entries()) {
      // Ignore plugins that have their feature flag disabled
      // If no featureFlag is present, then we assume it's enabled
      if (!plugin.featureFlag || featureFlags[plugin.featureFlag]) {
        // routes providers
        if (plugin.routes) {
          routes = routes.concat(plugin.routes)
        }

        // chain adapters providers
        plugin.providers?.chainAdapters?.forEach(([chain, factory]) => {
          // track newly registered adapters by plugins
          newChainAdapters[chain] = factory
        })
      }
    }

    // unregister the difference between what we had, and now have after loading plugins
    partitionCompareWith<ChainTypes>(
      currentChainAdapters,
      Object.keys(newChainAdapters) as ChainTypes[],
      {
        add: chain => {
          const factory = newChainAdapters[chain]
          if (factory) chainAdapterManager.addChain(chain, factory)
        },
        remove: chain => {
          chainAdapterManager.byChain(chain).closeTxs()
          chainAdapterManager.removeChain(chain)
        }
      }
    )

    setSupportedChains(chainAdapterManager.getSupportedChains())
  }, [plugins])

  if (!plugins) return <></>

  const values = {
    plugins,
    pluginManager,
    chainAdapterManager,
    supportedChains
  }

  return <PluginContext.Provider value={values}>{children}</PluginContext.Provider>
}

export const usePlugins = () => useContext(PluginContext)
export const useChainAdapters = () => useContext(PluginContext)?.chainAdapterManager
