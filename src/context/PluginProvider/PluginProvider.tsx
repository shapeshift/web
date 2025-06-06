import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { JSX } from 'react'
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { getChainAdapterManager } from './chainAdapterSingleton'

import { partitionCompareWith } from '@/lib/utils'
import { PluginManager } from '@/plugins'
import { activePlugins } from '@/plugins/activePlugins'
import type { Route } from '@/Routes/helpers'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'

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

export const PluginProvider = ({ children }: PluginProviderProps): JSX.Element => {
  const [supportedChains, setSupportedChains] = useState<ChainId[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const featureFlags = useSelector(preferences.selectors.selectFeatureFlags)

  const pluginManagerRef = useRef<PluginManager>(new PluginManager())
  const pluginManager = useMemo(() => pluginManagerRef.current, [pluginManagerRef])

  const chainAdapterManager = getChainAdapterManager()

  const plugins = useMemo(() => {
    pluginManager.clear()

    for (const plugin of activePlugins) {
      try {
        pluginManager.register(plugin())
      } catch (e) {
        console.log(e)
      }
    }

    return pluginManager.keys()
  }, [pluginManager])

  useEffect(() => {
    if (!plugins) return

    let pluginRoutes: Route[] = []

    // newly registered will be default + what comes from plugins
    const newChainAdapters: { [k in ChainId]?: () => ChainAdapter<KnownChainIds> } = {}

    // register providers from each plugin
    for (const plugin of pluginManager.values()) {
      // Ignore plugins that have their feature flag disabled
      // If no featureFlag is present, then we assume it's enabled
      const featureFlagEnabled =
        !plugin.featureFlag || plugin.featureFlag.some(flag => featureFlags[flag])

      if (featureFlagEnabled) {
        // Call the optional `onLoad` callback
        plugin.onLoad?.()
        // Add optional routes
        if (plugin.routes) {
          pluginRoutes = pluginRoutes.concat(plugin.routes)
        }

        // chain adapters providers
        plugin.providers?.chainAdapters?.forEach(([chain, factory]) => {
          // track newly registered adapters by plugins
          newChainAdapters[chain] = factory
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
          }
        },
        remove: chainId => {
          getChainAdapterManager().delete(chainId)
          getChainAdapterManager().get(chainId)?.closeTxs()
        },
      },
    )

    setRoutes(pluginRoutes)

    const _supportedChains = Object.values<ChainId>(KnownChainIds).filter(chainId => {
      if (!featureFlags.Optimism && chainId === KnownChainIds.OptimismMainnet) return false
      if (!featureFlags.Polygon && chainId === KnownChainIds.PolygonMainnet) return false
      if (!featureFlags.Gnosis && chainId === KnownChainIds.GnosisMainnet) return false
      if (!featureFlags.Arbitrum && chainId === KnownChainIds.ArbitrumMainnet) return false
      if (!featureFlags.ArbitrumNova && chainId === KnownChainIds.ArbitrumNovaMainnet) return false
      if (!featureFlags.Base && chainId === KnownChainIds.BaseMainnet) return false
      if (!featureFlags.Solana && chainId === KnownChainIds.SolanaMainnet) return false
      if (!featureFlags.Mayachain && chainId === KnownChainIds.MayachainMainnet) return false
      if (!featureFlags.BnbSmartChain && chainId === KnownChainIds.BnbSmartChainMainnet)
        return false
      return true
    })

    setSupportedChains(_supportedChains)
  }, [chainAdapterManager, featureFlags, pluginManager, plugins])

  const values = useMemo(
    () => ({
      plugins,
      pluginManager,
      chainAdapterManager,
      supportedChains,
      routes,
    }),
    [chainAdapterManager, pluginManager, plugins, routes, supportedChains],
  )

  if (!plugins) return <></>

  return <PluginContext.Provider value={values}>{children}</PluginContext.Provider>
}

export const usePlugins = () => useContext(PluginContext)
