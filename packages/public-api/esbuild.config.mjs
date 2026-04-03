import { spawn } from 'child_process'
import * as esbuild from 'esbuild'

const isWatch = process.argv.includes('--watch')

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

const sharedConfig = {
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
  logLevel: 'info',
}

if (isWatch) {
  let serverProcess = null

  const restartServer = () => {
    if (serverProcess) {
      serverProcess.once('exit', () => {
        serverProcess = spawn('node', ['--env-file=.env', 'dist/server.cjs'], { stdio: 'inherit' })
      })
      serverProcess.kill()
    } else {
      serverProcess = spawn('node', ['--env-file=.env', 'dist/server.cjs'], { stdio: 'inherit' })
    }
  }

  const ctx = await esbuild.context({
    ...sharedConfig,
    plugins: [
      ...sharedConfig.plugins,
      {
        name: 'restart-server',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length === 0) restartServer()
          })
        },
      },
    ],
  })

  await ctx.watch()
  console.log('Watching for changes...')
} else {
  const result = await esbuild.build({
    ...sharedConfig,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  })

  console.log('Build complete:', result)
}
