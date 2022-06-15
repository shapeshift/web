import * as fs from 'fs'
import { memoize } from 'lodash'
import * as path from 'path'

const excludedPluginNames = process.env.EXCLUDED_PLUGINS?.split(',') ?? []

export const getActivePluginNames = memoize(() => {
  const out: string[] = []
  const pluginPath = path.resolve(__dirname, '../src/plugins')
  for (const pluginDirEnt of fs.readdirSync(pluginPath, { withFileTypes: true })) {
    if (!pluginDirEnt.isDirectory()) continue
    if (!excludedPluginNames.includes(pluginDirEnt.name)) out.push(pluginDirEnt.name)
  }
  console.info('Active plugins:', out)
  return out
})
