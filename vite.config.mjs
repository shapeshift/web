import react from '@vitejs/plugin-react-swc'
import { dirname, resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
// import circularDependency from 'vite-plugin-circular-dependency'
import tsconfigPaths from 'vite-tsconfig-paths'

import { headers } from './headers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// External ShapeShift packages that need special handling
const externalShapeshiftPackages = [
  '@shapeshiftoss/hdwallet-core',
  '@shapeshiftoss/hdwallet-ledger',
  '@shapeshiftoss/hdwallet-native',
  '@shapeshiftoss/hdwallet-keepkey',
  '@shapeshiftoss/hdwallet-metamask',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tsconfigPaths(),
      // @TODO: reenable
      // circularDependency({
      //   exclude: /node_modules/,
      //   include: /src/,
      // }),
      process.env.ANALYZE === 'true' &&
        visualizer({
          open: true,
          filename: 'bundle-analysis.html',
        }),
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@shapeshiftmonorepo': resolve(__dirname, './packages'),
        process: 'process/browser',
        stream: 'stream-browserify',
        zlib: 'browserify-zlib',
        util: 'util/',
        'dayjs/locale': resolve(__dirname, 'node_modules/dayjs/locale'),
        crypto: 'crypto-browserify',
      },
    },
    optimizeDeps: {
      force: true,
      include: [
        'react',
        'react-dom',
        '@chakra-ui/react',
        'ethers',
        'buffer',
        'process',
        '@shapeshiftoss/hdwallet-coinbase',
        '@shapeshiftoss/hdwallet-core',
        '@shapeshiftoss/hdwallet-keepkey',
        '@shapeshiftoss/hdwallet-keepkey-webusb',
        '@shapeshiftoss/hdwallet-keplr',
        '@shapeshiftoss/hdwallet-ledger',
        '@shapeshiftoss/hdwallet-ledger-webusb',
        '@shapeshiftoss/hdwallet-metamask-multichain',
        '@shapeshiftoss/hdwallet-native',
        '@shapeshiftoss/hdwallet-native/dist/crypto/isolation/engines/default',
        '@shapeshiftoss/hdwallet-native/dist/crypto/isolation/engines',
        '@shapeshiftoss/hdwallet-native-vault',
        '@shapeshiftoss/hdwallet-phantom',
        '@shapeshiftoss/hdwallet-walletconnectv2',
        'dayjs',
      ],
      exclude: [
        '@shapeshiftmonorepo/types',
        '@shapeshiftmonorepo/chain-adapters',
        '@shapeshiftmonorepo/contracts',
        '@shapeshiftmonorepo/unchained-client',
        '@shapeshiftmonorepo/caip',
        '@shapeshiftmonorepo/errors',
        '@shapeshiftmonorepo/swapper',
        '@shapeshiftmonorepo/utils',
        ...externalShapeshiftPackages,
      ],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        target: 'esnext',
      },
    },
    server: {
      port: 3000,
      open: true,
      watch: {
        usePolling: true,
      },
      fs: {
        allow: ['..'],
      },
      headers,
    },
    root: './',
    publicDir: 'public',
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/node_modules/, /packages/, /@shapeshiftoss\/hdwallet-core/],
      },
      rollupOptions: {
        treeshake: true,
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: id => {
            // Vendor chunks - more granular splitting
            if (id.includes('node_modules')) {
              // UI related
              if (id.includes('react')) return 'vendor-react'
              if (id.includes('@chakra-ui')) return 'vendor-chakra'
              if (id.includes('@emotion/')) return 'vendor-emotion'
              if (id.includes('framer-motion')) return 'vendor-framer'

              // Blockchain related
              if (id.includes('ethers')) return 'vendor-ethers'
              if (id.includes('@shapeshiftoss/hdwallet')) return 'vendor-wallets'
              if (id.includes('web3')) return 'vendor-web3'
              if (id.includes('@web3-onboard')) return 'vendor-web3-onboard'
              if (id.includes('bitcoinjs')) return 'vendor-bitcoin'

              // Data handling
              if (id.includes('lodash')) return 'vendor-lodash'
              if (id.includes('dayjs')) return 'vendor-dayjs'
              if (id.includes('axios')) return 'vendor-axios'
              if (id.includes('query')) return 'vendor-query'
              if (id.includes('redux')) return 'vendor-redux'
              if (id.includes('zustand')) return 'vendor-state'

              // Utils and polyfills
              if (id.includes('buffer')) return 'vendor-buffer'
              if (id.includes('crypto-')) return 'vendor-crypto'
              if (id.includes('stream-')) return 'vendor-stream'
              if (id.includes('browserify-')) return 'vendor-browserify'

              // Split remaining node_modules into smaller chunks
              return 'vendor-other-' + id.split('node_modules/')[1].split('/')[0]
            }

            // Application code chunks
            if (id.includes('src/')) {
              if (id.includes('src/pages')) return 'pages'
              if (id.includes('src/components')) return 'components'
              if (id.includes('src/lib')) return 'lib'
              if (id.includes('src/features')) return 'features'
              if (id.includes('src/hooks')) return 'hooks'
              if (id.includes('src/context')) return 'context'
            }
            return null
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
        chunkSizeWarningLimit: 25000,
      },
      minify: mode === 'development' ? false : 'esbuild',
      sourcemap: mode === 'development' ? 'eval-cheap-module-source-map' : false,
      outDir: 'build',
      emptyOutDir: true,
    },
    define: {
      'process.env': JSON.stringify(env),
      global: 'globalThis',
      'process.browser': true,
    },
  }
})
