import { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

import { Route } from '../Routes/helpers'

const activePlugins = ['bitcoin', 'cosmos', 'ethereum', 'osmosis']

export type Plugins = [chainId: string, chain: Plugin][]
export type RegistrablePlugin = { register: () => Plugins }

export interface Plugin {
  name: string
  icon?: JSX.Element
  featureFlag?: keyof FeatureFlags
  providers?: {
    chainAdapters?: Array<[ChainId, () => ChainAdapter<ChainId>]>
  }
  routes?: Route[]
}

export class PluginManager {
  #pluginManager = new Map<string, Plugin>()

  clear(): void {
    this.#pluginManager.clear()
  }

  register(plugin: RegistrablePlugin): void {
    for (const [pluginId, pluginManifest] of plugin.register()) {
      if (this.#pluginManager.has(pluginId)) {
        throw new Error('PluginManager: Duplicate pluginId')
      }
      this.#pluginManager.set(pluginId, pluginManifest)
    }
  }

  entries(): [string, Plugin][] {
    return [...this.#pluginManager.entries()]
  }
}

// @TODO - In the future we may want to create a Provider for this
// if we need to support features that require re-rendering. Currently we do not.
export const pluginManager = new PluginManager()

export const registerPlugins = async () => {
  pluginManager.clear()

  for (const plugin of activePlugins) {
    pluginManager.register(await import(`./${plugin}/index.tsx`))
  }
}
