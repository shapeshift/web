import * as fs from 'fs'
import { uniq } from 'lodash'
import * as path from 'path'

import { getActivePluginNames } from './plugins'

const buildPath = path.resolve(__dirname, '../')

function getConfigKeysViaKludgyHack(path: string) {
  return Array.from(
    fs.readFileSync(path, { encoding: 'utf-8' }).matchAll(/REACT_APP_[A-Z0-9_]+/g),
  ).map(x => x[0])
}

function* generateBaseConfigKeys(dir: string): Generator<string, void, undefined> {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const subpath = path.join(dir, dirent.name)
    if (dirent.isDirectory()) {
      yield* generateBaseConfigKeys(subpath)
      continue
    }
    yield* getConfigKeysViaKludgyHack(subpath)
    // yield* Object.keys(require(subpath).default)
  }
}

function getPluginConfigKeys(name: string) {
  const pluginConfigPath = path.join(buildPath, 'src/plugins', name, 'config.ts')
  return getConfigKeysViaKludgyHack(pluginConfigPath)
  // return Object.keys(require(pluginConfigPath).validators)
}

function* generateConfigKeys() {
  yield* generateBaseConfigKeys(path.join(buildPath, 'src/config/validators'))
  for (const pluginName of getActivePluginNames()) {
    yield* getPluginConfigKeys(pluginName)
  }
}

export function getConfigKeys() {
  const out = uniq(Array.from(generateConfigKeys()).sort())
  console.info(`Config keys:`, out)
  return out
}
