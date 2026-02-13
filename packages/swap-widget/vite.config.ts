import react from '@vitejs/plugin-react'
import path from 'path'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const isLibBuild = process.env.BUILD_LIB === 'true'

const libExternals = [
  'react',
  'react-dom',
  'viem',
  'wagmi',
  '@reown/appkit',
  '@reown/appkit-adapter-wagmi',
  '@reown/appkit-adapter-bitcoin',
  '@reown/appkit-adapter-solana',
  '@tanstack/react-query',
]

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
export default defineConfig({
  plugins: isLibBuild
    ? [
        defineGlobalThis,
        nodePolyfills({
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        }) as unknown as PluginOption,
        react(),
      ]
    : [defineGlobalThis, react()],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@reown/appkit/core': path.resolve(
        __dirname,
        '../../node_modules/@reown/appkit/dist/esm/exports/core.js',
      ),
      '@reown/appkit/networks': path.resolve(
        __dirname,
        '../../node_modules/@reown/appkit/dist/esm/exports/networks.js',
      ),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 3001,
    open: false,
  },
  preview: {
    port: Number(process.env.PORT) || 3000,
    host: true,
  },
  build: isLibBuild
    ? {
        lib: {
          entry: 'src/index.ts',
          name: 'SwapWidget',
          fileName: 'index',
        },
        rollupOptions: {
          external: libExternals,
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
      }
    : {
        outDir: 'dist',
      },
})
