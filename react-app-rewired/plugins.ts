import * as fs from 'fs'
import { memoize } from 'lodash'
import * as path from 'path'
import type { ScreamingSnakeCase } from 'type-fest'

function toScreamingSnakeCase<T extends string>(x: T): ScreamingSnakeCase<T> {
  return x.replace(/[A-Z]/g, x => `_${x.toLowerCase()}`).toUpperCase() as ScreamingSnakeCase<T>
}

export const getActivePluginNames = memoize(() => {
  const out: string[] = []
  const pluginPath = path.resolve(__dirname, '../src/plugins')
  for (const pluginDirEnt of fs.readdirSync(pluginPath, { withFileTypes: true })) {
    if (!pluginDirEnt.isDirectory()) continue
    const manifestPath = path.join(pluginPath, pluginDirEnt.name, 'manifest.json')
    const disabledByDefault = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath).toString('utf-8')).disabledByDefault ?? false
      : false
    const pluginNameEnvVar = `PLUGIN_${toScreamingSnakeCase(pluginDirEnt.name)}` as const
    const enabled =
      process.env[pluginNameEnvVar] === 'true' ||
      (!disabledByDefault && process.env[pluginNameEnvVar] !== 'false')
    if (enabled) out.push(pluginDirEnt.name)
  }
  console.info('Active plugins:', out)
  return out
})
