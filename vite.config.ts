import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tsconfigPaths from 'vite-tsconfig-paths'

// External ShapeShift packages that need special handling
const externalShapeshiftPackages = [
  '@shapeshiftoss/hdwallet-core',
  '@shapeshiftoss/hdwallet-ledger',
  '@shapeshiftoss/hdwallet-native',
  '@shapeshiftoss/hdwallet-keepkey',
  '@shapeshiftoss/hdwallet-metamask',
]

// Custom plugin to support REACT_APP_ environment variables
const reactEnvPlugin = () => ({
  name: 'react-env',
  config: (config, { mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const processEnv = {}
    
    for (const [key, value] of Object.entries(env)) {
      if (key.startsWith('REACT_APP_')) {
        processEnv[`process.env.${key}`] = JSON.stringify(value)
      }
    }

    return {
      define: processEnv
    }
  }
})

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true,
      }),
      reactEnvPlugin(),
      tsconfigPaths(), // This will handle all path aliases from tsconfig.json
      // Handle node polyfills
      nodePolyfills({
        // Whether to polyfill specific globals
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        // Whether to polyfill `node:` protocol imports
        protocolImports: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shapeshiftmonorepo': path.resolve(__dirname, './packages'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@chakra-ui/react',
        'ethers',
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
      ],
      esbuildOptions: {
        define: {
          global: 'globalThis'
        }
      }
    },
    server: {
      port: 3000,
      open: true,
      hmr: {
        overlay: false, // Disable the error overlay
      },
      watch: {
        usePolling: true,
      },
      fs: {
        // Allow serving files from one level up to the project root
        allow: ['..'],
      },
      // Add any proxy configurations if needed
      // proxy: {
      //   '/api': {
      //     target: 'http://localhost:8080',
      //     changeOrigin: true,
      //   },
      // },
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      }
    },
    define: {
      'process.env.REACT_APP_SNAP_VERSION': JSON.stringify(env.REACT_APP_SNAP_VERSION),
      'process.env.REACT_APP_PORTALS_BASE_URL': JSON.stringify(env.REACT_APP_PORTALS_BASE_URL),
      'process.env.REACT_APP_ZERION_BASE_URL': JSON.stringify(env.REACT_APP_ZERION_BASE_URL),
      'process.env.REACT_APP_ZRX_BASE_URL': JSON.stringify(env.REACT_APP_ZRX_BASE_URL),
      'process.env.REACT_APP_CHAINFLIP_API_KEY': JSON.stringify(env.REACT_APP_CHAINFLIP_API_KEY),
      'process.env.REACT_APP_CHAINFLIP_API_URL': JSON.stringify(env.REACT_APP_CHAINFLIP_API_URL),
    },
  }
})
