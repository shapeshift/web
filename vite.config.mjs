import react from '@vitejs/plugin-react-swc'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tsconfigPaths()],
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
      'process.env': {},
      global: 'globalThis',
    },
    build: {
      rollupOptions: {
        external: [],
        output: {
          format: 'es',
          exports: 'named',
          manualChunks(id) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('scheduler') ||
              id.includes('@emotion/') ||
              id.includes('@chakra-ui/') ||
              id.includes('framer-motion')
            ) {
              return 'vendor-core'
            }

            return null
          },
          chunkFileNames(chunkInfo) {
            const prefix =
              {
                'vendor-core': '00',
                'vendor-ui': '10',
              }[chunkInfo.name] || '99'

            return `assets/${prefix}-${chunkInfo.name}-[hash].js`
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
        preserveModules: false,
        format: 'es',
        chunkSizeWarningLimit: 25000,
      },
      target: ['es2020'],
      minify: mode === 'development' ? false : 'esbuild',
      sourcemap: mode === 'development' ? 'eval-cheap-module-source-map' : false,
      outDir: 'build',
      emptyOutDir: true,
    },
  }
})
