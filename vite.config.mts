import react from '@vitejs/plugin-react-swc'
import * as fs from 'fs'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { dirname, resolve } from 'path'
import * as path from 'path'
import * as ssri from 'ssri'
import { fileURLToPath } from 'url'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import checker from 'vite-plugin-checker'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tsconfigPaths from 'vite-tsconfig-paths'

import { cspMeta, headers, serializeCsp } from './headers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const VITE_CSP_META = serializeCsp(cspMeta)

const publicFilesEnvVars = {
  VITE_CSP_META: JSON.stringify(VITE_CSP_META),
}

const publicPath = path.join(__dirname, 'public')

for (const dirent of fs.readdirSync(publicPath, { withFileTypes: true })) {
  if (!dirent.isFile()) continue
  const mungedName = dirent.name
    .toUpperCase()
    .split('')
    .map(x => (/^[0-9A-Z]$/.test(x) ? x : '_'))
    .join('')
  const data = fs.readFileSync(path.join(publicPath, dirent.name))

  const integrity = ssri.fromData(data, {
    strict: true,
    algorithms: ['sha256'],
  })
  publicFilesEnvVars[`VITE_SRI_${mungedName}`] = JSON.stringify(integrity)

  const digest = sha256.digest(data)
  const cid = CID.create(1, raw.code, digest).toString()
  publicFilesEnvVars[`VITE_CID_${mungedName}`] = JSON.stringify(cid)
}

// For whatever reason, globalThis is not defined for the local esbuild environment while
// using the vite-plugin-node-polyfills plugin. This plugin will appropriately define globalThis
// to fix this scenario (may be resolved in a future release of vite-plugin-node-polyfills hopefully).
const defineGlobalThis: PluginOption = {
  name: 'define-global-this',
  enforce: 'pre',
  transform(code) {
    if (code.includes('vite-plugin-node-polyfills')) {
      return `if (typeof globalThis === 'undefined') {
        globalThis = typeof window !== 'undefined' ? window :
                     typeof global !== 'undefined' ? global :
                     typeof self !== 'undefined' ? self : this;
      };${code}`
    }
  },
}

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      mode === 'development' && !process.env.DEPLOY && defineGlobalThis,
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
      react(),
      tsconfigPaths(),
      checker({
        typescript: {
          typescriptPath: path.join(__dirname, './node_modules/typescript/lib/tsc.js'),
        },
        overlay: true,
      }),
      process.env.ANALYZE === 'true' &&
        analyzer({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: true,
        }),
    ],
    define: {
      ...Object.fromEntries(
        Object.entries(publicFilesEnvVars).map(([key, value]) => [`import.meta.env.${key}`, value]),
      ),
      ...Object.fromEntries(
        Object.entries(publicFilesEnvVars).map(([key, value]) => [`process.env.${key}`, value]),
      ),
    },
    server: {
      port: 3000,
      headers,
      host: '0.0.0.0',
    },
    preview: {
      port: 3000,
      headers,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        'ethers/lib/utils': 'ethers5/lib/utils.js',
        'ethers/lib/utils.js': 'ethers5/lib/utils.js',
        'dayjs/locale': resolve(__dirname, 'node_modules/dayjs/locale'),
      },
    },
    build: {
      target: 'esnext',
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: id => {
            if (id.includes('node_modules')) {
              if (id.match(/(framer-motion|@visx|@coral-xyz)/)) return 'ui'
              if (id.match(/(react-icons|@react-spring|react-datepicker|react-dom)/)) return 'react'
              if (id.match(/(dayjs|lodash|@formatjs)/)) return 'utils'
              if (id.match(/(@redux|@tanstack)/)) return 'state'
              if (id.match(/(@metaplex-foundation|@solana)/)) return 'solana'
              if (id.match(/(@sentry|mixpanel|@moralisweb3)/)) return 'sdk'
              if (id.includes('cosmjs-types')) return 'cosmjs-types'
              if (id.includes('osmojs')) return 'osmojs'
              if (id.includes('@arbitrum')) return '@arbitrum'
              if (id.includes('@metamask')) return '@metamask'
              if (id.includes('@walletconnect')) return '@walletconnect'
              if (id.includes('@keepkey/keepkey-sdk')) return '@keepkey'
              if (id.includes('bnb-javascript-sdk-nobroadcast')) return 'bnb-sdk'

              return null
            }

            if (id.includes('assets/translations')) return 'translations'
            if (id.includes('packages/unchained-client')) return 'unchained-client'

            return null
          },
          hashCharacters: 'hex',
        },
        onwarn(warning, warn) {
          // Ignore annotation warnings with /*#__PURE__*/ pattern
          if (warning.message.includes('/*#__PURE__*/') || warning.message.includes('A comment'))
            return

          // Ignore eval warnings in dependencies
          if (warning.code === 'EVAL' && warning.id?.includes('node_modules')) return

          // Ignore dynamic import chunking warnings
          const dynamicImport = 'dynamic import will not move module into another chunk'
          if (warning.plugin === 'vite:reporter' && warning.message.includes(dynamicImport)) return

          warn(warning)
        },
      },
      minify: mode === 'development' && !process.env.DEPLOY ? false : 'esbuild',
      sourcemap: mode === 'development' && !process.env.DEPLOY ? 'inline' : true,
      outDir: 'build',
    },
  }
})
