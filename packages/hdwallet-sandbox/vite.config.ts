import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const resolveEthersV5ForHdwallet: PluginOption = {
  name: 'resolve-ethers-v5-hdwallet',
  enforce: 'pre',
  resolveId(source, importer) {
    if (
      (source === 'ethers' || source.startsWith('ethers/')) &&
      importer &&
      /\/packages\/hdwallet-/.test(importer)
    ) {
      const target = source === 'ethers' ? 'ethers5' : source.replace('ethers/', 'ethers5/')
      return this.resolve(target, importer, { skipSelf: true })
    }
  },
}

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  optimizeDeps: {
    include: ['@ethereumjs/tx', 'gridplus-sdk > @ethereumjs/tx'],
    esbuildOptions: {
      target: 'esnext',
      supported: {
        bigint: true,
      },
    },
  },
  plugins: [
    resolveEthersV5ForHdwallet,
    nodePolyfills({
      globals: {
        Buffer: false,
        global: false,
        process: false,
      },
      protocolImports: true,
    }),
  ],
  build: {
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/, /packages\/hdwallet-.+\/dist\/.*\.js$/],
      transformMixedEsModules: true,
    },
    target: 'esnext',
  },
})
