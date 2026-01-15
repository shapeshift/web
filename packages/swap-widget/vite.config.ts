import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const isLibBuild = process.env.BUILD_LIB === 'true'

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

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [
    defineGlobalThis,
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }) as unknown as PluginOption,
    react(),
  ],
  define: {
    'process.env': {},
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  resolve: {
    alias: {
      'ethers/lib/utils': 'ethers',
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
          external: ['react', 'react-dom'],
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
