import react from '@vitejs/plugin-react-swc'
import * as fs from 'fs'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { dirname, resolve } from 'path'
import * as path from 'path'
import * as ssri from 'ssri'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
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

export default defineConfig(mode => ({
  plugins: [
    react(),
    tsconfigPaths(),
    checker({
      typescript: {
        typescriptPath: path.join(__dirname, './node_modules/typescript/lib/tsc.js'),
      },
      overlay: true,
    }),
  ],
  server: {
    port: 3000,
    watch: {
      usePolling: true,
    },
    fs: {
      allow: ['..'],
    },
    headers,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shapeshiftmonorepo': resolve(__dirname, './packages'),
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      typescript: 'typescript',
      url: 'url',
      buffer: 'buffer',
      process: 'process/browser',
      'dayjs/locale': resolve(__dirname, 'node_modules/dayjs/locale'),
    },
  },
  define: {
    ...Object.fromEntries(
      Object.entries(publicFilesEnvVars).map(([key, value]) => [`import.meta.env.${key}`, value]),
    ),
    ...Object.fromEntries(
      Object.entries(publicFilesEnvVars).map(([key, value]) => [`process.env.${key}`, value]),
    ),
    global: 'globalThis',
    'global.Buffer': ['buffer', 'Buffer'],
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          // Bundle React and polyfills together to ensure they're available
          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('scheduler') ||
            id.includes('buffer') ||
            id.includes('process') ||
            id.includes('polyfills')
          ) {
            return 'vendor-react'
          }
          return null
        },
        chunkFileNames: chunkInfo => {
          const prefix =
            {
              polyfills: '00',
              'vendor-react': '01',
            }[chunkInfo.name] || '99'

          return `assets/${prefix}-${chunkInfo.name}-[hash].js`
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      preserveModules: false,
      format: 'es',
      exports: 'named',
    },
    minify: mode === 'development' ? false : 'esbuild',
    sourcemap: mode === 'development' ? 'eval-cheap-module-source-map' : false,
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
      'crypto-browserify',
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}))
