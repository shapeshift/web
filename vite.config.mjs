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
            if (id.includes('node_modules')) {
              // Core dependencies - must load first
              if (id.includes('react/') || id.includes('react-dom/')) return 'vendor-react-core'
              if (id.includes('@emotion/') || id.includes('stylis')) return 'vendor-emotion-core'

              // FormatJS and its dependencies
              if (
                id.includes('@formatjs') ||
                id.includes('intl-messageformat') ||
                id.includes('intl-format-cache') ||
                id.includes('intl-messageformat-parser')
              )
                return 'vendor-formatjs-core'

              // Largest packages (>500KB)
              if (id.includes('@ledgerhq')) return 'vendor-ledger'
              if (id.includes('@shapeshiftoss')) return 'vendor-shapeshift'
              if (id.includes('@metaplex-foundation')) return 'vendor-metaplex'
              if (id.includes('@walletconnect')) return 'vendor-walletconnect'
              if (id.includes('osmojs')) return 'vendor-osmojs'
              if (id.includes('@keepkey')) return 'vendor-keepkey'
              if (id.includes('@ethereumjs')) return 'vendor-ethereumjs'

              // Medium packages (>200KB)
              if (id.includes('ethers')) return 'vendor-ethers'
              if (id.includes('web3')) return 'vendor-web3'
              if (id.includes('@arbitrum')) return 'vendor-arbitrum'
              if (id.includes('axios')) return 'vendor-axios'
              if (id.includes('libsodium')) return 'vendor-libsodium'
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
          chunkFileNames: chunkInfo => {
            // Control loading order with prefixes
            const prefix =
              {
                'vendor-react-core': '00',
                'vendor-emotion-core': '01',
                'vendor-formatjs-core': '02',
              }[chunkInfo.name] || '99'

            return `assets/${prefix}-${chunkInfo.name}-[hash].js`
          },
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
