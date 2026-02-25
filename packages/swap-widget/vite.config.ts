import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

/**
 * Externals for the library build.
 *
 * We use a function so that sub-path imports (e.g. "viem/chains",
 * "@reown/appkit/react") are matched automatically without listing
 * every possible entry-point.
 */
const LIB_EXTERNAL_PREFIXES = [
  'react',
  'react-dom',
  'viem',
  'wagmi',
  '@reown/appkit',
  '@reown/appkit-adapter-wagmi',
  '@reown/appkit-adapter-bitcoin',
  '@reown/appkit-adapter-solana',
  '@tanstack/react-query',
  '@solana/web3.js',
  '@solana/wallet-adapter-wallets',
]

function isExternal(id: string): boolean {
  return LIB_EXTERNAL_PREFIXES.some(prefix => id === prefix || id.startsWith(`${prefix}/`))
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

/** Set BUILD_DEMO=true to build the standalone demo app instead of the library. */
const isDemoBuild = process.env.BUILD_DEMO === 'true'

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
    }) as unknown as PluginOption,
    react(),
    ...(!isDemoBuild
      ? [
          dts({
            tsconfigPath: './tsconfig.build.json',
            rollupTypes: true,
          }),
        ]
      : []),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env': {},
  },
  optimizeDeps: {
    exclude: ['@shapeshiftoss/caip', '@shapeshiftoss/utils'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 5174,
    open: false,
  },
  preview: {
    port: Number(process.env.PORT) || 3000,
    host: true,
  },
  publicDir: isDemoBuild ? 'public' : false,
  build: isDemoBuild
    ? {
        outDir: 'dist',
      }
    : {
        lib: {
          entry: 'src/index.ts',
          name: 'SwapWidget',
          fileName: 'index',
          formats: ['es'],
        },
        cssCodeSplit: false,
        rollupOptions: {
          external: isExternal,
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
      },
})
