import react from '@vitejs/plugin-react'
import * as fs from 'fs'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import * as path from 'path'
import { dirname, resolve } from 'path'
import * as ssri from 'ssri'
import { fileURLToPath } from 'url'
import type { PluginOption } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import checker from 'vite-plugin-checker'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tsconfigPaths from 'vite-tsconfig-paths'

import { cspMeta, headers, serializeCsp } from './headers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const VITE_CSP_META = serializeCsp(cspMeta)

const publicFilesEnvVars = {
  VITE_CSP_META: JSON.stringify(VITE_CSP_META),
}

const publicPath = path.join(__dirname, 'public')

for (const dirent of fs.readdirSync(publicPath, { withFileTypes: true })) {
  if (!dirent.isFile()) continue
  const mungedName = dirent.name
    .toUpperCase()
    .split('')
    .map(x => (/^[0-9A-Z]$/.test(x) ? x : '_'))
    .join('')
  const data = fs.readFileSync(path.join(publicPath, dirent.name))

  const integrity = ssri.fromData(data, {
    strict: true,
    algorithms: ['sha256'],
  })
  publicFilesEnvVars[`VITE_SRI_${mungedName}`] = JSON.stringify(integrity)

  const digest = sha256.digest(data)
  const cid = CID.create(1, raw.code, digest).toString()
  publicFilesEnvVars[`VITE_CID_${mungedName}`] = JSON.stringify(cid)
}

// For whatever reason, globalThis is not defined for the local esbuild environment while
// using the vite-plugin-node-polyfills plugin. This plugin will appropriately define globalThis
// to fix this scenario (may be resolved in a future release of vite-plugin-node-polyfills hopefully).
// hdwallet workspace packages depend on ethers v5 (BigNumber, providers, etc.)
// but Vite pre-bundles the root's ethers v6 for bare 'ethers' imports.
// This plugin conditionally resolves 'ethers' to 'ethers5' (npm:ethers@5.7.2)
// only when the importer is an hdwallet source file, preserving ethers v6 for the root app.
const resolveEthersV5ForHdwallet: PluginOption = {
  name: 'resolve-ethers-v5-hdwallet',
  enforce: 'pre',
  async resolveId(source, importer) {
    if (source === 'ethers' && importer && /\/packages\/hdwallet-/.test(importer)) {
      return this.resolve('ethers5', importer, { skipSelf: true })
    }
  },
}

// hdwallet workspace packages depend on bech32 v1 (flat API: bech32.toWords, bech32.encode)
// but Vite pre-bundles the root's bech32 v2 for bare 'bech32' imports.
// v2 exports { bech32, bech32m } instead of flat functions, breaking hdwallet at runtime.
// This plugin resolves 'bech32' to the 'bech32-v1' aliased package (npm:bech32@1.1.4) for hdwallet source files,
// following the same pattern as resolveEthersV5ForHdwallet with ethers5.
const resolveBech32V1ForHdwallet: PluginOption = {
  name: 'resolve-bech32-v1-hdwallet',
  enforce: 'pre',
  async resolveId(source, importer) {
    if (source === 'bech32' && importer && /\/packages\/hdwallet-/.test(importer)) {
      return this.resolve('bech32-v1', importer, { skipSelf: true })
    }
  },
}

// Zcash v5 trusted input fix: @ledgerhq/hw-app-btc computes SHA256d for trusted inputs,
// but Zcash v5 uses ZIP-244 tree hashes. The runtime monkey-patch in hdwallet-ledger/src/bitcoin.ts
// doesn't work in Vite dev (ESM, no `require()`). Instead, we patch the source at build time.
//
// This plugin does two things:
// 1. Transforms getTrustedInputBIP143.js to check for _customZcashTxId (set by hdwallet-ledger)
//    - Dev mode: handled by esbuild plugin in optimizeDeps.esbuildOptions.plugins (pre-bundling)
//    - Prod build: handled by the Vite transform hook below (rollup pipeline)
// 2. Strips the dead runtime require() monkey-patch from hdwallet-ledger to avoid console errors

const zcashTrustedInputPatchRegex =
  /function getTrustedInputBIP143\(transport, indexLookup, transaction, additionals\s*=\s*\[\]\)\s*\{/
const zcashTrustedInputPatchReplacement = `function getTrustedInputBIP143(transport, indexLookup, transaction, additionals = []) {
    // Zcash v5 patch: use correct TXID from adapter instead of SHA256d of mangled v5 tx
    if (additionals && additionals.includes("zcash") && transaction && transaction._customZcashTxId && transaction._customZcashAmount) {
        const hash = Buffer.from(transaction._customZcashTxId, "hex").reverse();
        const data = Buffer.alloc(4);
        data.writeUInt32LE(indexLookup, 0);
        const amountBuf = Buffer.alloc(8);
        amountBuf.writeBigUInt64LE(BigInt(transaction._customZcashAmount));
        return Buffer.concat([hash, data, amountBuf]).toString("hex");
    }`

const patchZcashTrustedInput: PluginOption = {
  name: 'patch-zcash-trusted-input',
  enforce: 'pre',
  transform(code, id) {
    // 1. Patch getTrustedInputBIP143 — only fires during production rollup builds
    //    (dev mode pre-bundling uses the esbuild plugin in optimizeDeps instead)
    if (id.includes('@ledgerhq/hw-app-btc') && id.includes('getTrustedInputBIP143')) {
      const patched = code.replace(zcashTrustedInputPatchRegex, zcashTrustedInputPatchReplacement)
      if (patched !== code) {
        return { code: patched, map: null }
      }
    }
    // 2. Strip the dead runtime monkey-patch from hdwallet-ledger (it can't work in ESM)
    if (id.includes('packages/hdwallet-ledger/src/bitcoin.ts') && code.includes('require(')) {
      return {
        code: code.replace(
          /try\s*\{[^}]*require\('@ledgerhq\/hw-app-btc\/lib\/getTrustedInputBIP143'\)[\s\S]*?\} catch \(e\) \{[^}]*\}/,
          '// Zcash v5 trusted input patch applied via Vite plugin (patchZcashTrustedInput)',
        ),
        map: null,
      }
    }
  },
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

const serveCompressedAssets: PluginOption = {
  name: 'serve-compressed-assets',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/generated/') || !req.url?.includes('.json')) {
        return next()
      }

      const acceptEncoding = req.headers['accept-encoding'] || ''
      const urlWithoutQuery = req.url.split('?')[0]
      const filePath = path.join(publicPath, urlWithoutQuery)

      if (!filePath.startsWith(publicPath + path.sep)) {
        return next()
      }

      const tryServeCompressed = (
        encoding: string,
        extension: string,
        contentType: string,
      ): boolean => {
        const compressedPath = `${filePath}.${extension}`
        if (fs.existsSync(compressedPath)) {
          res.setHeader('Content-Type', contentType)
          res.setHeader('Content-Encoding', encoding)
          res.setHeader('Vary', 'Accept-Encoding')
          fs.createReadStream(compressedPath).pipe(res)
          return true
        }
        return false
      }

      if (acceptEncoding.includes('br') && tryServeCompressed('br', 'br', 'application/json')) {
        return
      }

      if (acceptEncoding.includes('gzip') && tryServeCompressed('gzip', 'gz', 'application/json')) {
        return
      }

      next()
    })
  },
}

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      resolveEthersV5ForHdwallet,
      resolveBech32V1ForHdwallet,
      patchZcashTrustedInput,
      mode === 'development' && !process.env.DEPLOY && defineGlobalThis,
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
      react({
        babel: {
          plugins: [
            [
              'babel-plugin-react-compiler',
              {
                compilationMode: 'infer', // Auto-compile components following Rules of React
              },
            ],
          ],
        },
      }),
      tsconfigPaths(),
      checker({
        typescript: {
          typescriptPath: path.join(__dirname, './node_modules/typescript/lib/tsc.js'),
        },
        overlay: true,
      }),
      process.env.ANALYZE === 'true' &&
        analyzer({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: true,
        }),
      serveCompressedAssets,
    ],
    define: {
      ...Object.fromEntries(
        Object.entries(publicFilesEnvVars).map(([key, value]) => [`import.meta.env.${key}`, value]),
      ),
      ...Object.fromEntries(
        Object.entries(publicFilesEnvVars).map(([key, value]) => [`process.env.${key}`, value]),
      ),
      ...Object.fromEntries(
        Object.entries(env)
          .filter(([key]) => key.startsWith('VITE_'))
          .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
      ),
    },
    server: {
      port: 3000,
      headers,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/user-api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/user-api/, ''),
        },
        '/swaps-api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/swaps-api/, ''),
        },
        '/notifications-api': {
          target: 'http://localhost:3003',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/notifications-api/, ''),
        },
      },
    },
    preview: {
      port: 3000,
      headers,
    },
    worker: {
      format: 'es',
    },
    resolve: {
      // Ensure a single copy of React packages (prevents duplicate bundling in pnpm)
      dedupe: ['react', 'react-dom', 'react-is', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      alias: {
        '@': resolve(__dirname, './src'),
        'ethers/lib/utils': 'ethers5/lib/utils.js',
        'ethers/lib/utils.js': 'ethers5/lib/utils.js',
        'dayjs/locale': resolve(__dirname, 'node_modules/dayjs/locale'),
        '@shapeshiftoss/hdwallet-native/nativeEvents': resolve(__dirname, './packages/hdwallet-native/src/nativeEvents.ts'),
        '@shapeshiftoss/hdwallet-native/crypto/revocable': resolve(__dirname, './packages/hdwallet-native/src/crypto/isolation/engines/default/revocable.ts'),
        '@shapeshiftoss/hdwallet-core': resolve(__dirname, './packages/hdwallet-core/src'),
        '@shapeshiftoss/caip': resolve(__dirname, './packages/caip/src'),
        '@shapeshiftoss/types': resolve(__dirname, './packages/types/src'),
      },
    },
    build: {
      target: 'esnext',
      commonjsOptions: {
        transformMixedEsModules: true,
        exclude: ['@shapeshiftoss/caip', '@shapeshiftoss/types'],
      },
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: id => {
            if (id.includes('node_modules')) {
              // buffer polyfill must be in its own chunk to avoid circular deps between ui↔sdk in pnpm
              // Matches: node_modules/buffer/, node_modules/base64-js/, node_modules/ieee754/,
              // and also vite-plugin-node-polyfills/shims/buffer/ and safe-buffer
              if (/\/node_modules\/(buffer|base64-js|ieee754|safe-buffer)\//.test(id)) return 'polyfills'
              if (/vite-plugin-node-polyfills\/shims\/buffer\//.test(id)) return 'polyfills'
              if (id.match(/(framer-motion|@visx|@coral-xyz)/)) return 'ui'
              if (id.match(/(react-icons|@react-spring|react-datepicker|react-dom)/)) return 'react'
              // Ensure core 'react' package is in the 'react' chunk to prevent duplication in pnpm
              if (/\/node_modules\/react\//.test(id) && !/\/@[^/]+\/react/.test(id)) return 'react'
              if (id.match(/(dayjs|lodash|@formatjs)/)) return 'utils'
              if (id.match(/(@redux|@tanstack)/)) return 'state'
              if (id.match(/(@sentry|mixpanel|@moralisweb3|moralis)/)) return 'sdk'
              if (id.match(/(embla-carousel)/)) return 'carousel'
              if (id.includes('lightweight-charts')) return 'charts'
              if (id.includes('html5-qrcode')) return 'qr-scanner'
              if (id.includes('react-scan')) return 'react-scan'
              if (id.includes('styled-components')) return 'styled-components'
              if (id.includes('date-fns')) return 'date-fns'
              if (id.includes('valibot')) return 'valibot'
              if (id.includes('@0noco/graphqllsp')) return 'graphqllsp'

              return null
            }

            if (id.includes('assets/translations')) return 'translations'
            if (id.includes('localAssetData')) return 'local-asset-data'

            return null
          },
          hashCharacters: 'hex',
        },
        onwarn(warning, warn) {
          // Ignore annotation warnings with /*#__PURE__*/ pattern
          if (warning.message.includes('/*#__PURE__*/') || warning.message.includes('A comment'))
            return

          // Ignore eval warnings in dependencies
          if (warning.code === 'EVAL' && warning.id?.includes('node_modules')) return

          // Ignore dynamic import chunking warnings
          const dynamicImport = 'dynamic import will not move module into another chunk'
          if (warning.plugin === 'vite:reporter' && warning.message.includes(dynamicImport)) return

          warn(warning)
        },
      },
      minify: mode === 'development' && !process.env.DEPLOY ? false : 'esbuild',
      sourcemap: mode === 'development' && !process.env.DEPLOY ? 'inline' : false,
      outDir: 'build',
    },
    optimizeDeps: {
      esbuildOptions: {
        plugins: [
          {
            name: 'patch-zcash-trusted-input',
            setup(build) {
              build.onLoad({ filter: /getTrustedInputBIP143\.js$/ }, args => {
                const contents = fs.readFileSync(args.path, 'utf8')
                const patched = contents.replace(
                  zcashTrustedInputPatchRegex,
                  zcashTrustedInputPatchReplacement,
                )
                return { contents: patched !== contents ? patched : contents, loader: 'js' }
              })
            },
          },
        ],
      },
    },
  }
})
