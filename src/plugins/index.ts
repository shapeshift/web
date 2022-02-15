import type { CAIP19 } from '@shapeshiftoss/caip'

import { Route } from '../Routes/helpers'

const activePlugins = ['bitcoin', 'cosmos']

export type AccountProps = { accountId: string }
export type AssetProps = { assetId: CAIP19 }
export type SearchableAssetProps = { collapsed: boolean; search?: string }
export type Plugins = [caip2: string, chain: Plugin][]
export type RegistrablePlugin = { register: () => Plugins }

export interface Plugin {
  name: string
  icon: JSX.Element
  disabled?: boolean
  widgets?: {
    accounts?: {
      list?: React.FC<SearchableAssetProps>
      row?: React.FC<AccountProps>
    }
    assets?: {
      list?: React.FC<SearchableAssetProps>
      row?: React.FC<AssetProps>
    }
  }
  routes: {
    home: React.ReactNode
  }
}

class PluginManager {
  #pluginManager = new Map<string, Plugin>()

  register(plugin: RegistrablePlugin): void {
    for (const [pluginId, pluginManifest] of plugin.register()) {
      if (this.#pluginManager.has(pluginId)) {
        throw new Error('PluginManager: Duplicate pluginId')
      }
      this.#pluginManager.set(pluginId, pluginManifest)
    }
  }

  getPlugins() {
    return this.#pluginManager.entries()
  }

  getPlugin(pluginId: string) {
    return this.#pluginManager.get(pluginId)
  }

  getRoutes(): Route[] {
    const routes = []
    for (const [id, plugin] of this.#pluginManager.entries()) {
      routes.push({
        disable: Boolean(plugin.disabled),
        label: plugin.name,
        icon: plugin.icon,
        path: `/plugins/${id}`,
        main: plugin.routes.home
      })
    }

    return routes
  }
}

// @TODO - In the future we may want to create a Provider for this
// if we need to support features that require re-rendering. Currently we do not.
export const pluginManager = new PluginManager()

export const registerPlugins = async () => {
  for (const plugin of activePlugins) {
    pluginManager.register(await import(`./${plugin}/index.tsx`))
  }
}
