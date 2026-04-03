import { defineConfig } from 'tsup'

const EXTERNAL_PREFIXES = [
  '@reown/appkit',
  '@reown/appkit-adapter-bitcoin',
  '@reown/appkit-adapter-solana',
  '@reown/appkit-adapter-wagmi',
  '@solana/wallet-adapter-wallets',
  '@solana/web3.js',
  '@tanstack/react-query',
  '@wagmi/core',
  'react',
  'react-dom',
  'viem',
  'wagmi',
]

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  external: EXTERNAL_PREFIXES.flatMap(prefix => [prefix, new RegExp(`^${prefix}/`)]),
})
