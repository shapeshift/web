/// <reference types="node" />
import 'dotenv/config'

import * as esbuild from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'

process.env.NODE_ENV ??= 'production'
const isDev = process.env.NODE_ENV === 'production'

const workspacePath = path.resolve(__dirname, '..')
const buildPath = path.join(workspacePath, 'build')
const rootPath = path.normalize(path.join(workspacePath, '.'))
const sanitizeBuildDir = async () => {
  await fs.promises.rm(buildPath, { recursive: true, force: true })
  await fs.promises.mkdir(buildPath, { recursive: true })
}

const collectDefines = async () => {
  const defines = Object.fromEntries(
    Object.entries(process.env)
      .filter(([k]) => ['NODE_DEBUG', 'NODE_ENV', 'LOG_LEVEL', 'DEBUG', 'PUBLIC_URL'].includes(k))
      .map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)]),
  ) as Record<string, string>
  console.info('Embedded environment vars:', defines)
  return defines
}

const runEsbuild = async (
  defines: Record<string, string>,
) => {
  return esbuild.build({
    bundle: true,
    absWorkingDir: rootPath,
    outdir: buildPath,
    loader: {
      '.png': 'file',
      '.svg': 'file',
      '.jpg': 'file',
      '.mp3': 'file',
      '.wav': 'file',
    },
    entryPoints: [path.join(workspacePath, '/src/index.tsx')],
		jsx: 'automatic',
    plugins: await Promise.all([
			NodeModulesPolyfillPlugin(),
			NodeGlobalsPolyfillPlugin({
				process: true,
				buffer: true,
			}),
    ]),
    sourcemap: isDev ? 'linked' : undefined,
    legalComments: isDev ? 'linked' : undefined,
    minify: !isDev,
    format: 'iife',
    assetNames: 'static/media/[name].[hash]',
    charset: 'utf8',
    metafile: true,
    chunkNames: 'static/js/[hash].chunk',
    define: defines,
    target: 'es2020',
		tsconfig: './tsconfig.json',
    treeShaking: true,
  })
}


export const build = async () => {
  await sanitizeBuildDir()
	await runEsbuild({})
}

if (require.main === module) {
  build().catch(err => console.error(err))
}
