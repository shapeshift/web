import { defineConfig } from 'tsup'

const EXTERNAL_PREFIXES = [
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

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  external: EXTERNAL_PREFIXES.flatMap(prefix => [prefix, new RegExp(`^${prefix}/`)]),
})
