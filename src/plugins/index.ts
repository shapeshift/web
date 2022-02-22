import type { CAIP19 } from '@shapeshiftoss/caip'

import { Route } from '../Routes/helpers'

const activePlugins = ['cosmos']

export type AssetProps = { assetId: CAIP19 }
export type Plugins = [caip2: string, chain: Plugin][]
export type RegistrablePlugin = { register: () => Plugins }

export interface Plugin {
  name: string
  icon: JSX.Element
  disabled?: boolean
  routes: Route[]
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

  getRoutes(): Route[] {
    let routes: Route[] = []
    for (const [, plugin] of this.#pluginManager.entries()) {
      if (!plugin.disabled) {
        routes = routes.concat(plugin.routes)
      }
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
