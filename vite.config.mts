import react from '@vitejs/plugin-react'
import * as fs from 'fs'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import * as path from 'path'
import { dirname, resolve } from 'path'
import * as ssri from 'ssri'
import { fileURLToPath } from 'url'
import type { PluginOption } from 'vite'
import { defineConfig, loadEnv } from 'vite'
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

const serveCompressedAssets: PluginOption = {
  name: 'serve-compressed-assets',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/generated/') || !req.url?.includes('.json')) {
        return next()
      }

      const acceptEncoding = req.headers['accept-encoding'] || ''
      const urlWithoutQuery = req.url.split('?')[0]
      const filePath = path.join(publicPath, urlWithoutQuery)

      if (!filePath.startsWith(publicPath + path.sep)) {
        return next()
      }

      const tryServeCompressed = (
        encoding: string,
        extension: string,
        contentType: string,
      ): boolean => {
        const compressedPath = `${filePath}.${extension}`
        if (fs.existsSync(compressedPath)) {
          res.setHeader('Content-Type', contentType)
          res.setHeader('Content-Encoding', encoding)
          res.setHeader('Vary', 'Accept-Encoding')
          fs.createReadStream(compressedPath).pipe(res)
          return true
        }
        return false
      }

      if (acceptEncoding.includes('br') && tryServeCompressed('br', 'br', 'application/json')) {
        return
      }

      if (acceptEncoding.includes('gzip') && tryServeCompressed('gzip', 'gz', 'application/json')) {
        return
      }

      next()
    })
  },
}

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

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
      react({
        babel: {
          plugins: [
            [
              'babel-plugin-react-compiler',
              {
                compilationMode: 'infer', // Auto-compile components following Rules of React
              },
            ],
          ],
        },
      }),
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
      serveCompressedAssets,
    ],
    define: {
      ...Object.fromEntries(
        Object.entries(publicFilesEnvVars).map(([key, value]) => [`import.meta.env.${key}`, value]),
      ),
      ...Object.fromEntries(
        Object.entries(publicFilesEnvVars).map(([key, value]) => [`process.env.${key}`, value]),
      ),
      ...Object.fromEntries(
        Object.entries(env)
          .filter(([key]) => key.startsWith('VITE_'))
          .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
      ),
    },
    server: {
      port: 3000,
      headers,
      host: '0.0.0.0',
      proxy: {
        '/user-api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/user-api/, ''),
        },
        '/swaps-api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/swaps-api/, ''),
        },
        '/notifications-api': {
          target: 'http://localhost:3003',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/notifications-api/, ''),
        },
      },
    },
    preview: {
      port: 3000,
      headers,
    },
    worker: {
      format: 'es',
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        'ethers/lib/utils': 'ethers5/lib/utils.js',
        'ethers/lib/utils.js': 'ethers5/lib/utils.js',
        'dayjs/locale': resolve(__dirname, 'node_modules/dayjs/locale'),
        '@shapeshiftoss/caip': resolve(__dirname, './packages/caip/src'),
        '@shapeshiftoss/types': resolve(__dirname, './packages/types/src'),
      },
    },
    build: {
      target: 'esnext',
      commonjsOptions: {
        transformMixedEsModules: true,
        exclude: ['@shapeshiftoss/caip', '@shapeshiftoss/types'],
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
              if (id.match(/(@sentry|mixpanel|@moralisweb3|moralis)/)) return 'sdk'
              if (id.match(/(embla-carousel)/)) return 'carousel'
              if (id.includes('lightweight-charts')) return 'charts'
              if (id.includes('html5-qrcode')) return 'qr-scanner'
              if (id.includes('react-scan')) return 'react-scan'
              if (id.includes('styled-components')) return 'styled-components'
              if (id.includes('protobufjs')) return 'protobuf'
              if (id.includes('date-fns')) return 'date-fns'
              // Group ledger with its crypto dependencies to avoid circular chunk deps
              if (id.match(/(@ledgerhq|@noble|@scure|@bitgo)/)) return 'ledger'
              if (id.includes('cosmjs-types')) return 'cosmjs-types'
              if (id.includes('osmojs')) return 'osmojs'
              if (id.includes('@arbitrum')) return '@arbitrum'
              if (id.includes('@metamask')) return '@metamask'
              if (id.includes('@walletconnect')) return '@walletconnect'
              if (id.includes('@keepkey/keepkey-sdk')) return '@keepkey'
              if (id.includes('bnb-javascript-sdk-nobroadcast')) return 'bnb-sdk'
              if (id.includes('gridplus-sdk')) return 'gridplus-sdk'
              if (id.includes('tronweb')) return 'tronweb'
              if (id.includes('viem')) return 'viem'
              if (id.includes('@mysten')) return '@mysten'
              if (id.includes('valibot')) return 'valibot'
              if (id.includes('@0noco/graphqllsp')) return 'graphqllsp'

              // Those chunks should be imported last as they heavily rely on other chunks and default order doesnt work
              if (id.includes('@cetusprotocol')) return 'z-@cetusprotocol'
              if (id.includes('graphql')) return 'z-graphql'

              return null
            }

            if (id.includes('assets/translations')) return 'translations'
            if (id.includes('packages/unchained-client')) return 'unchained-client'
            if (id.includes('localAssetData')) return 'local-asset-data'

            // This chunk should be imported last as it heavily relies on other chunks and default order doesnt work
            if (id.includes('packages/chain-adapters')) return 'z-chain-adapters'

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
