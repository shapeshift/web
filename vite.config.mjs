import react from '@vitejs/plugin-react-swc'
import * as fs from 'fs'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { dirname, resolve } from 'path'
import * as path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import * as ssri from 'ssri'
import { fileURLToPath } from 'url'
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

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      tsconfigPaths(),
      nodePolyfills({
        globals: {
          process: true,
          Buffer: true,
          stream: true,
        },
        protocolImports: true,
      }),
      checker({
        typescript: {
          typescriptPath: path.join(__dirname, './node_modules/typescript/lib/tsc.js'),
        },
        overlay: true,
      }),
      process.env.VISUALIZE === 'true' &&
        visualizer({
          open: true,
          filename: 'build/stats.html',
          gzipSize: true,
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
      },
    },
    build: {
      target: 'esnext',
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      chunkSizeWarningLimit: 2000,
      assetsInlineLimit: 4096,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (/(react)/.test(id)) {
                return 'vendor-react'
              }

              if (
                /(@chakra-ui|@emotion|@visx|embla|vaul|qr-image|styled-components|lightweight-charts|html)/.test(
                  id,
                )
              ) {
                return 'vendor-ui'
              }

              if (/(@shapeshiftoss\/hdwallet-|@keepkey|@ledgerhq|@walletconnect)/.test(id)) {
                return 'vendor-wallet'
              }

              if (
                /(@arbitrum|@cowprotocol|@uniswap|@jup-ag|@lifi|@metaplex|@solana|alchemy-sdk|viem|wagmi|ethers|mixpanel|mipd)/.test(
                  id,
                )
              ) {
                return 'vendor-sdks'
              }

              if (
                /(@formatjs|@lukemorales|sentry|@sniptt|@tanstack|axios|bignumber\.js|bip|dayjs|lodash|myzod|p-|reselect|redux|qs|pretty-ms|web-vitals|uuid|node-polyglot|match-sorter|localforage|jsonrpc)/.test(
                  id,
                )
              ) {
                return 'vendor-utility'
              }

              return 'vendor-other'
            }

            return null
          },
          chunkFileNames: chunkInfo => {
            const prefix =
              {
                'vendor-react': '01',
                'vendor-ui': '02',
                'vendor-wallet': '03',
                'vendor-sdks': '04',
                'vendor-utility': '05',
              }[chunkInfo.name] || '99'

            return `assets/${prefix}-${chunkInfo.name}-[hash].js`
          },
          hashCharacters: 'hex',
          hashFunction: 'sha256',
          entryFileNames: 'assets/[name]-[hash].js',
        },
        onwarn(warning, warn) {
          // Ignore annotation warnings with /*#__PURE__*/ pattern
          if (warning.message.includes('/*#__PURE__*/') || warning.message.includes('A comment')) {
            return
          }

          // Ignore Node.js module externalization warnings
          if (
            warning.code === 'PLUGIN_WARNING' &&
            warning.message.includes('has been externalized for browser compatibility')
          ) {
            return
          }

          // Ignore eval warnings in dependencies
          if (
            warning.code === 'EVAL' &&
            (warning.id?.includes('node_modules/js-sha256') ||
              warning.id?.includes('node_modules/google-protobuf') ||
              warning.id?.includes('node_modules/@protobufjs/inquire'))
          ) {
            return
          }

          // Ignore dynamic import chunking warnings
          if (
            warning.plugin === 'vite:reporter' &&
            warning.message.includes('dynamic import will not move module into another chunk')
          ) {
            return
          }

          warn(warning)
        },
      },
      minify: mode === 'development' && !process.env.DISABLE_SOURCE_MAP ? false : 'esbuild',
      sourcemap: mode === 'development' && !process.env.DISABLE_SOURCE_MAP ? 'inline' : false,
      outDir: 'build',
      emptyOutDir: true,
    },
    optimizeDeps: {
      force: true,
      include: [
        'react',
        'react-dom',
        '@chakra-ui/react',
        'ethers',
        'ethers5',
        '@shapeshiftoss/hdwallet-coinbase',
        '@shapeshiftoss/hdwallet-core',
        '@shapeshiftoss/hdwallet-keepkey',
        '@shapeshiftoss/hdwallet-keepkey-webusb',
        '@shapeshiftoss/hdwallet-keplr',
        '@shapeshiftoss/hdwallet-ledger',
        '@shapeshiftoss/hdwallet-ledger-webusb',
        '@shapeshiftoss/hdwallet-metamask-multichain',
        '@shapeshiftoss/hdwallet-native',
        '@shapeshiftoss/hdwallet-native-vault',
        '@shapeshiftoss/hdwallet-phantom',
        '@shapeshiftoss/hdwallet-walletconnectv2',
        'dayjs',
      ],
    },
  }
})
