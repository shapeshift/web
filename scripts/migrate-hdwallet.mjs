#!/usr/bin/env node

/**
 * Migration script: copies hdwallet packages from the hdwallet repo into web's packages/ directory
 * as workspace packages. Generates adapted package.json and tsconfig files for each.
 *
 * Usage: node scripts/migrate-hdwallet.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = resolve(__dirname, '..')
const HDWALLET_ROOT = resolve(WEB_ROOT, '../shapeshiftHdWallet')
const HDWALLET_PACKAGES = join(HDWALLET_ROOT, 'packages')
const WEB_PACKAGES = join(WEB_ROOT, 'packages')

// All 24 hdwallet packages
const PACKAGE_DIRS = readdirSync(HDWALLET_PACKAGES)
  .filter(d => d.startsWith('hdwallet-'))
  .sort()

// Packages that exist in the web workspace and should use workspace:^ when referenced by hdwallet
const WEB_WORKSPACE_PACKAGES = new Set([
  '@shapeshiftoss/caip',
  '@shapeshiftoss/types',
  '@shapeshiftoss/chain-adapters',
  '@shapeshiftoss/contracts',
  '@shapeshiftoss/errors',
  '@shapeshiftoss/swapper',
  '@shapeshiftoss/unchained-client',
  '@shapeshiftoss/utils',
])

// Map hdwallet internal dep names to their directory names for tsconfig references
function depNameToDir(name) {
  return name.replace('@shapeshiftoss/', '')
}

function isHdwalletDep(name) {
  return name.startsWith('@shapeshiftoss/hdwallet-')
}

// Build the adapted package.json
function buildPackageJson(originalPkg, dirName) {
  const deps = { ...(originalPkg.dependencies || {}) }
  const peerDeps = { ...(originalPkg.peerDependencies || {}) }
  const devDeps = { ...(originalPkg.devDependencies || {}) }

  // Convert internal hdwallet deps to workspace:^
  for (const key of Object.keys(deps)) {
    if (isHdwalletDep(key)) deps[key] = 'workspace:^'
    if (WEB_WORKSPACE_PACKAGES.has(key)) deps[key] = 'workspace:^'
  }
  for (const key of Object.keys(peerDeps)) {
    if (isHdwalletDep(key)) peerDeps[key] = 'workspace:^'
    if (WEB_WORKSPACE_PACKAGES.has(key)) peerDeps[key] = 'workspace:^'
  }

  const result = {
    name: originalPkg.name,
    version: originalPkg.version,
    license: originalPkg.license || 'MIT',
    type: 'module',
    main: 'dist/cjs/index.js',
    module: 'dist/esm/index.js',
    types: 'dist/esm/index.d.ts',
    exports: {
      '.': {
        import: './dist/esm/index.js',
        require: './dist/cjs/index.js',
        types: './dist/esm/index.d.ts',
      },
    },
    files: ['dist'],
    publishConfig: { access: 'public' },
    scripts: {
      build: 'yarn clean && yarn run -T tsc --build && yarn postbuild',
      clean: 'rm -rf dist',
      dev: 'yarn run -T tsc --build --watch',
      postbuild: 'yarn postbuild:esm && yarn postbuild:cjs',
      'postbuild:esm': 'yarn run -T tsc-esm-fix --target=dist/esm --ext=.js',
      'postbuild:cjs': "echo '{\"type\": \"commonjs\"}' > dist/cjs/package.json",
    },
    dependencies: deps,
  }

  if (Object.keys(peerDeps).length > 0) {
    result.peerDependencies = peerDeps
  }
  if (Object.keys(devDeps).length > 0) {
    result.devDependencies = devDeps
  }

  return result
}

// Get internal hdwallet references for tsconfig
function getInternalRefs(originalPkg) {
  const allDeps = {
    ...(originalPkg.dependencies || {}),
    ...(originalPkg.peerDependencies || {}),
  }
  return Object.keys(allDeps)
    .filter(isHdwalletDep)
    .map(depNameToDir)
}

// Build tsconfig.json (meta - references ESM+CJS)
function buildTsconfigRoot() {
  return {
    extends: '../../tsconfig.packages.json',
    files: [],
    references: [
      { path: './tsconfig.esm.json' },
      { path: './tsconfig.cjs.json' },
    ],
  }
}

// Build tsconfig.esm.json
function buildTsconfigEsm(internalRefs, hasModulesDts) {
  const config = {
    extends: '../../tsconfig.packages.json',
    compilerOptions: {
      module: 'esnext',
      rootDir: 'src',
      outDir: 'dist/esm',
      tsBuildInfoFile: 'dist/esm/.tsbuildinfo',
      noUnusedLocals: false,
      noUnusedParameters: false,
      skipLibCheck: true,
    },
    include: ['src/**/*'],
    exclude: ['dist', '**/*.test.ts', '**/__tests__/**', '**/__mocks__/**'],
  }

  if (internalRefs.length > 0) {
    config.references = internalRefs.map(ref => ({
      path: `../${ref}/tsconfig.esm.json`,
    }))
  }

  return config
}

// Build tsconfig.cjs.json
function buildTsconfigCjs(internalRefs) {
  const config = {
    extends: '../../tsconfig.packages.json',
    compilerOptions: {
      module: 'commonjs',
      rootDir: 'src',
      outDir: 'dist/cjs',
      tsBuildInfoFile: 'dist/cjs/.tsbuildinfo',
      noUnusedLocals: false,
      noUnusedParameters: false,
      skipLibCheck: true,
    },
    include: ['src/**/*'],
    exclude: ['dist', '**/*.test.ts', '**/__tests__/**', '**/__mocks__/**'],
  }

  if (internalRefs.length > 0) {
    config.references = internalRefs.map(ref => ({
      path: `../${ref}/tsconfig.cjs.json`,
    }))
  }

  return config
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n')
}

// Copy source directory, excluding tests
function copySrc(srcDir, destDir) {
  cpSync(srcDir, destDir, {
    recursive: true,
    filter: (src) => {
      const basename = src.split('/').pop()
      // Exclude test files and directories
      if (basename === '__tests__' || basename === '__mocks__') return false
      if (basename.endsWith('.test.ts')) return false
      if (basename.endsWith('.test.js')) return false
      return true
    },
  })
}

// Main
console.log(`Migrating ${PACKAGE_DIRS.length} hdwallet packages...`)
console.log(`From: ${HDWALLET_PACKAGES}`)
console.log(`To: ${WEB_PACKAGES}`)
console.log()

for (const dirName of PACKAGE_DIRS) {
  const srcPkgDir = join(HDWALLET_PACKAGES, dirName)
  const destPkgDir = join(WEB_PACKAGES, dirName)
  const srcPkgJsonPath = join(srcPkgDir, 'package.json')

  if (!existsSync(srcPkgJsonPath)) {
    console.log(`  SKIP ${dirName} (no package.json)`)
    continue
  }

  const originalPkg = JSON.parse(readFileSync(srcPkgJsonPath, 'utf8'))
  const internalRefs = getInternalRefs(originalPkg)

  console.log(`  ${dirName} -> packages/${dirName}/`)

  // Create destination directory
  mkdirSync(destPkgDir, { recursive: true })

  // Copy src/
  const srcSrcDir = join(srcPkgDir, 'src')
  const destSrcDir = join(destPkgDir, 'src')
  if (existsSync(srcSrcDir)) {
    copySrc(srcSrcDir, destSrcDir)
    console.log(`    - Copied src/`)
  }

  // Generate package.json
  const newPkg = buildPackageJson(originalPkg, dirName)
  writeJson(join(destPkgDir, 'package.json'), newPkg)
  console.log(`    - Generated package.json`)

  // Check for modules.d.ts
  const hasModulesDts = existsSync(join(destSrcDir, 'modules.d.ts'))

  // Generate tsconfig files
  writeJson(join(destPkgDir, 'tsconfig.json'), buildTsconfigRoot())
  writeJson(join(destPkgDir, 'tsconfig.esm.json'), buildTsconfigEsm(internalRefs, hasModulesDts))
  writeJson(join(destPkgDir, 'tsconfig.cjs.json'), buildTsconfigCjs(internalRefs))
  console.log(`    - Generated tsconfig.json, tsconfig.esm.json, tsconfig.cjs.json`)
  if (internalRefs.length > 0) {
    console.log(`    - References: ${internalRefs.join(', ')}`)
  }
}

console.log()
console.log('Done! Next steps:')
console.log('  1. Update root package.json deps to workspace:^')
console.log('  2. Update chain-adapters and swapper deps + tsconfig refs')
console.log('  3. Update tsconfig.packages.json and tsconfig.json')
console.log('  4. Update vite.config.mts commonjsOptions.exclude')
console.log('  5. Fix require() in packages/hdwallet-ledger/src/bitcoin.ts')
console.log('  6. Run: yarn install && yarn build:packages && yarn type-check')
