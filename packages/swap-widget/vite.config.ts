import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const isLibBuild = process.env.BUILD_LIB === 'true'

const externalPatterns = [
  /^react$/,
  /^react-dom$/,
  /starknet/,
  /tronweb/,
  /@solana\//,
  /@mysten\/sui/,
  /@near-js\//,
  /@coral-xyz\/anchor/,
  /@arbitrum\/sdk/,
  /@cowprotocol\//,
  /@avnu\//,
  /@cetusprotocol\//,
  /@defuse-protocol\//,
  /@uniswap\//,
  /node:crypto/,
  /node:events/,
]

const isExternal = (id: string) => externalPatterns.some(pattern => pattern.test(id))

const isExternalNonReact = (id: string) => {
  if (id === 'react' || id === 'react-dom') return false
  return isExternal(id)
}

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
          external: isExternal,
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
        rollupOptions: {
          external: isExternalNonReact,
        },
      },
})
