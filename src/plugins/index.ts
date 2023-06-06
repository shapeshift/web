import type { Plugin, Plugins } from 'plugins/types'

export class PluginManager {
  #pluginManager = new Map<string, Plugin>()

  clear(): void {
    this.#pluginManager.clear()
  }

  register(plugin: Plugins): void {
    for (const [pluginId, pluginManifest] of plugin) {
      this.#pluginManager.set(pluginId, pluginManifest)
    }
  }

  entries(): [string, Plugin][] {
    return [...this.#pluginManager.entries()]
  }

  keys() {
    return [...this.#pluginManager.keys()]
  }
}
