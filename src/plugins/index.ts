import type { CAIP2, CAIP19 } from '@shapeshiftoss/caip'

const activePlugins = ['bitcoin', 'ethereum', 'cosmos']

export type AccountProps = { accountId: string }
export type AssetProps = { assetId: CAIP19 }
export type SearchableAssetProps = { collapsed: boolean; search?: string }
export type Plugins = [caip2: string, chain: Plugin][]
export type RegistrablePlugin = { register: () => Plugins }

export interface Plugin {
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
    home: {
      [k: CAIP2]: React.FC
    }
  }
}

class PluginManager {
  #pluginManager = new Map<string, Plugin>()

  register(plugin: RegistrablePlugin): void {
    for (const [pluginId, chain] of plugin.register()) {
      if (this.#pluginManager.has(pluginId)) {
        throw new Error('PluginManager: Duplicate pluginId')
      }
      this.#pluginManager.set(pluginId, chain)
    }
  }

  getPlugins() {
    return Object.fromEntries(this.#pluginManager.entries())
  }
}

export const pluginManager = new PluginManager()
export const registerPlugins = async () => {
  for (const chain in activePlugins) {
    pluginManager.register(await import(`./${chain}/index.tsx`))
  }
}
