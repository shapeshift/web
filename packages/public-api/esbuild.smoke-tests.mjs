import * as esbuild from 'esbuild'

const result = await esbuild.build({
  entryPoints: ['tests/run-smoke-tests.ts'],
  bundle: true,
  outfile: 'dist/smoke-tests.cjs',
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  external: ['fsevents'],
  logLevel: 'info',
})

console.log('Smoke tests build complete:', result)
