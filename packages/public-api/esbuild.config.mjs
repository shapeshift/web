import * as esbuild from 'esbuild'

const result = await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/server.cjs',
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  external: [
    // Keep native modules external
    'fsevents',
    // Exclude all cowswap-related packages that have ethers import issues
    '@cowprotocol/*',
  ],
  alias: {
    // Alias ethers/lib/utils to ethers which has the utils re-exported
    'ethers/lib/utils': 'ethers',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'info',
})

console.log('Build complete:', result)
