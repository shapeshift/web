import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv } from 'vite'
// import circularDependency from 'vite-plugin-circular-dependency'
import tsconfigPaths from 'vite-tsconfig-paths'

import { headers } from './headers'

// External ShapeShift packages that need special handling
const externalShapeshiftPackages = [
  '@shapeshiftoss/hdwallet-core',
  '@shapeshiftoss/hdwallet-ledger',
  '@shapeshiftoss/hdwallet-native',
  '@shapeshiftoss/hdwallet-keepkey',
  '@shapeshiftoss/hdwallet-metamask',
]


export default defineConfig(async ({ mode }) => {
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
        '@': path.resolve(__dirname, './src'),
        '@shapeshiftmonorepo': path.resolve(__dirname, './packages'),
        process: 'process/browser',
        stream: 'stream-browserify',
        zlib: 'browserify-zlib',
        util: 'util/',
        'dayjs/locale': path.resolve(__dirname, 'node_modules/dayjs/locale'),
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
        input: {
          main: './public/index.html',
        },
        output: {
          experimentalMinChunkSize: 6 * 1024 * 1024,
          hashFunction: 'sha256',
        },
      },
      minify: mode === 'development' ? false : 'esbuild',
      sourcemap: mode === 'development' ? 'eval-cheap-module-source-map' : false,
      outDir: 'build',
      emptyOutDir: true,
    },
    define: {
      'process.env': JSON.stringify(env),
      global: 'globalThis',
      "process.browser": true
    },
  }
})
