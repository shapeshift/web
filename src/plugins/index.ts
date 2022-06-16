import { logger } from 'lib/logger'

import { Plugin } from './types'

export * from './types'

const moduleLogger = logger.child({ namespace: ['PluginManager'] })

// @TODO - In the future we may want to create a Provider for this
// if we need to support features that require re-rendering. Currently we do not.
export class PluginManager extends Map<string, Plugin> {}
export const pluginManager = new PluginManager()

export async function registerPlugins() {
  pluginManager.clear()

  // This can't be a synchronous import because it can create dependency loops.
  // (PluginProvider -> plugins/index -> plugin/active -> each plugin, so if
  // any active plugin imports anything that ends up importing PluginProvider
  // things fall over.)
  const { activePlugins } = await import('./active')
  for (const [pluginName, registrablePlugin] of Object.entries(activePlugins)) {
    try {
      const plugin = registrablePlugin.register()
      pluginManager.set(pluginName, plugin)
      moduleLogger.trace(
        { fn: 'registerPlugins', pluginManager, pluginName, plugin },
        'Registered plugin',
      )
    } catch (e) {
      moduleLogger.error(
        e,
        { fn: 'registerPlugins', pluginManager, pluginName, registrablePlugin },
        'Failed to register plugin',
      )
    }
  }

  moduleLogger.debug(
    { pluginManager, plugins: pluginManager.keys() },
    'Plugin Registration Completed',
  )
}
