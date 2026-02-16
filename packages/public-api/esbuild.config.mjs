import * as esbuild from 'esbuild'

const ethersCompatPlugin = {
  name: 'ethers-compat',
  setup(build) {
    build.onResolve({ filter: /^ethers\/lib\/utils$/ }, args => {
      // hdwallet packages have their own ethers v5 where ethers/lib/utils exists natively
      if (args.resolveDir.includes('hdwallet-')) return undefined
      // Other packages (e.g. @cowprotocol/app-data) use ethers v6 which re-exports utils at the top level
      return build.resolve('ethers', { resolveDir: args.resolveDir, kind: args.kind })
    })
  },
}

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
  ],
  plugins: [ethersCompatPlugin],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'info',
})

console.log('Build complete:', result)
