import react from '@vitejs/plugin-react-swc'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { cspMeta, headers, serializeCsp } from './headers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const VITE_CSP_META = serializeCsp(cspMeta)

export default defineConfig(mode => ({
  plugins: [react(), tsconfigPaths()],
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
      url: 'url',
      buffer: 'buffer',
      process: 'process/browser',
      'dayjs/locale': resolve(__dirname, 'node_modules/dayjs/locale'),
    },
  },
  define: {
    'import.meta.env.VITE_CSP_META': JSON.stringify(VITE_CSP_META),
    'process.env.VITE_CSP_META': JSON.stringify(VITE_CSP_META),
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
    include: ['buffer', 'process'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}))
