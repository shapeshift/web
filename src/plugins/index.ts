import { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { Route } from 'Routes/helpers'
import { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

export type Plugins = [chainId: string, chain: Plugin][]
export type RegistrablePlugin = { register: () => Plugins }

export interface Plugin {
  name: string
  icon?: JSX.Element
  featureFlag?: keyof FeatureFlags
  onLoad?: () => void
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
