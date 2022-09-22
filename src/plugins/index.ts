import type { Plugin, Plugins } from 'plugins/types'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['plugins', 'PluginManager'] })

export class PluginManager {
  #pluginManager = new Map<string, Plugin>()

  clear(): void {
    this.#pluginManager.clear()
  }

  register(plugin: Plugins): void {
    for (const [pluginId, pluginManifest] of plugin) {
      if (this.#pluginManager.has(pluginId)) {
        moduleLogger.warn(
          { fn: 'register', pluginId },
          'Duplicate pluginId. Overwriting with new plugin manifest',
        )
      }
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
