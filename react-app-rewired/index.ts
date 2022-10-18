import CircularDependencyPlugin from 'circular-dependency-plugin'
import stableStringify from 'fast-json-stable-stringify'
import * as fs from 'fs'
import * as _ from 'lodash'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import * as path from 'path'
import * as ssri from 'ssri'
import * as webpack from 'webpack'
import { SubresourceIntegrityPlugin } from 'webpack-subresource-integrity'

import { cspMeta, headers, serializeCsp } from './headers'
import { progressPlugin } from './progress'

type DevServerConfigFunction = (
  proxy: unknown,
  allowedHost: unknown,
) => Record<string, unknown> & { headers?: Record<string, string> }

const buildPath = path.resolve(__dirname, '..')

process.env.REACT_APP_CSP_META = serializeCsp(cspMeta)
console.info('Headers:', headers)
console.info('Meta CSP:', cspMeta)

// The HTML template can pull in static assets from outside of the Webpack
// pipeline; these need SRI too. This generates SRI attributes for each static
// asset, exporting them as predictably-named REACT_APP_SRI_FILENAME_EXT
// environment variables that can be used in the template.
const publicPath = path.join(buildPath, 'public')
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
  process.env[`REACT_APP_SRI_${mungedName}`] = integrity.toString()

  // While we're at it, also calculate IPFS CIDs for everything.
  // The typings here are imprecise; sha256.digest() never returns a Promise.
  const digest = sha256.digest(data) as Awaited<ReturnType<typeof sha256['digest']>>
  const cid = CID.create(1, raw.code, digest).toString()
  process.env[`REACT_APP_CID_${mungedName}`] = cid
}

const reactAppRewireConfig = {
  webpack: (config: webpack.Configuration, mode: webpack.Configuration['mode']) => {
    const isProduction = mode === 'production'
    const isDevelopment = mode === 'development'

    // Initialize top-level arrays just in case they're missing for some reason.
    _.merge(config, {
      plugins: [],
      ignoreWarnings: [],
    })

    // Webpack 5 no longer bundles polyfills for default Node modules, but we depend on some
    // packages that need them to work.
    //
    // (If https://github.com/facebook/create-react-app/issues/11756 ever gets officially fixed,
    // we should probably align with whatever solution is chosen.)
    _.merge(config, {
      resolve: {
        fallback: {
          crypto: require.resolve('crypto-browserify'),
          http: require.resolve('stream-http'),
          https: require.resolve('https-browserify'),
          path: require.resolve('path-browserify'),
          stream: require.resolve('stream-browserify'),
          zlib: require.resolve('browserify-zlib'),
        },
      },
      // Also provide polyfills for some Node globals.
      plugins: [
        ...(config.plugins ?? []),
        new webpack.ProvidePlugin({
          Buffer: ['buffer/', 'Buffer'],
          process: ['process/browser.js'],
        }),
        progressPlugin,
      ],
    })

    // Cloudflare Pages has a max asset size of 25 MiB. Without limiting the chunk size,
    // generated chunks or source maps may exceed this limit. 6 MiB seems to keep the max
    // gzipped chunk size ~1MiB and the max source map size ~8MiB, which avoids tripping
    // CRA's "The bundle size is significantly larger than recommended" warning.
    _.merge(
      config,
      isProduction
        ? {
            optimization: {
              splitChunks: {
                chunks: 'all',
                name: isDevelopment ? undefined : false, // _.merge() ignores undefined
                maxSize: 6 * 1024 * 1024,
              },
              // This uses numerically-ascending chunk IDs with no gaps, a la Webpack 4. Webpack 5
              // numbers chunks differently, and it's not obvious that they're deterministic. If
              // we can determine that chunk ids are deterministic without this option, it can go.
              chunkIds: 'natural',
            },
          }
        : undefined,
    )

    // Webpack uses MD4 by default, but SHA-256 can be verified with standard tooling.
    _.merge(config, {
      output: {
        hashFunction: 'sha256',
      },
    })

    // Ignore warnings raised by source-map-loader. Some third party packages ship misconfigured
    // sourcemap paths and cause many spurious warnings.
    //
    // Removable when https://github.com/facebook/create-react-app/pull/11752 is merged upstream.
    _.merge(config, {
      ignoreWarnings: [
        ...(config.ignoreWarnings ?? []),
        function ignoreSourceMapLoaderWarnings(warning: webpack.WebpackError) {
          return (
            (warning.module as { resource?: string } | undefined)?.resource?.includes?.(
              'node_modules',
            ) && warning.details?.includes?.('source-map-loader')
          )
        },
      ],
    })

    // Remove synthetic CSP/SRI/CID environment variables from DefinePlugin.
    _.merge(config, {
      plugins: (config.plugins ?? []).map(plugin => {
        if (plugin.constructor.name !== 'DefinePlugin') return plugin

        const definitions = JSON.parse(
          JSON.stringify((plugin as unknown as { definitions: unknown }).definitions),
        )
        const env = definitions['process.env'] ?? {}

        for (const key in env) {
          if (/^REACT_APP_(CSP|SRI|CID)_.*$/.test(key)) delete env[key]
        }

        return new webpack.DefinePlugin(definitions)
      }),
    })

    // Generate and embed Subresource Integrity (SRI) attributes for all files.
    // Automatically embeds SRI hashes when generating the embedded webpack loaders
    // for split code.
    _.merge(config, {
      output: {
        // This is the default, but the SRI spec requires it to be set explicitly.
        crossOriginLoading: 'anonymous',
      },
      // SubresourceIntegrityPlugin automatically disables itself in development.
      plugins: [
        ...(config.plugins ?? []),
        new SubresourceIntegrityPlugin({
          hashFuncNames: ['sha256'],
        }),
      ],
    })

    _.merge(config, {
      plugins: [
        ...(config.plugins ?? []),
        new CircularDependencyPlugin({
          exclude: /node_modules/,
          include: /src/,
          // raise error on circular imports
          failOnError: true,
          // allow import cycles that include an asyncronous import,
          // e.g. via import(/* webpackMode: "weak" */ './file.js')
          allowAsyncCycles: false,
          // set the current working directory for displaying module paths
          cwd: process.cwd(),
        }),
      ],
    })

    // Collect env vars that would have been injected via DefinePlugin. We will emit them
    // as dynamically-loaded JSON later instead of find/replacing the string 'process.env'.
    // This ensures that the minified Webpack output will be the same no matter the build
    // options being used.
    const env = Object.fromEntries(
      Object.entries(
        (config.plugins ?? [])
          .filter(plugin => plugin.constructor.name === 'DefinePlugin')
          .reduceRight<webpack.DefinePlugin | undefined>(
            (_a, x) => x as webpack.DefinePlugin,
            undefined,
          )?.definitions?.['process.env'] ?? {},
      )
        .filter(([, v]) => v)
        .map(([k, v]) => [k, JSON.parse(v)]),
    )
    // Update the Webpack config to emit the collected env vars as `env.json` and load them
    // dynamically instead of baking them into each chunk that might reference them.
    _.merge(
      config,
      isProduction
        ? {
            plugins: [
              ...(config.plugins ?? []).map(plugin => {
                switch (plugin.constructor.name) {
                  case 'DefinePlugin': {
                    // Remove all REACT_APP_* 'process.env' entries from DefinePlugin; these will
                    // be pulled from env.json via src/config.ts and src/env/index.ts.
                    if (
                      Object.keys((plugin as webpack.DefinePlugin).definitions).filter(
                        x => x !== 'process.env',
                      ).length !== 0
                    ) {
                      throw new Error('Unexpected DefinePlugin entries')
                    }
                    const definitions = Object.fromEntries(
                      Object.entries(env)
                        .filter(([k]) => !k.startsWith('REACT_APP_'))
                        .sort((a, b) => {
                          if (a[0] < b[0]) return -1
                          if (a[0] > b[0]) return 1
                          return 0
                        }),
                    )
                    console.info('Embedded environment vars:', definitions)
                    return new webpack.DefinePlugin(
                      Object.fromEntries(
                        Object.entries(definitions).map(([k, v]) => [
                          `process.env.${k}`,
                          JSON.stringify(v),
                        ]),
                      ),
                    )
                  }
                  default:
                    return plugin
                }
              }),
            ],
            module: {
              rules: [
                ...(config.module?.rules ?? []),
                {
                  // This rule causes the (placeholder) contents of `src/env/env.json` to be thrown away
                  // and replaced with `stableStringify(env)`, which is then written out to `build/env.json`.
                  //
                  // Note that simply adding this rule doesn't force `env.json` to be generated. That happens
                  // because `src/env/process.js` `require()`s it, and that module is provided via ProvidePlugin
                  // above. If nothing ever uses that `process` global, both `src/env/process.js` and `env.json`
                  // will be omitted from the build.
                  resource: path.join(buildPath, 'src/env/env.json'),
                  // Webpack loads resources by reading them from disk and feeding them through a series
                  // of loaders. It then emits them by feeding the result to a generator.
                  //
                  // The `val-loader` plugin is a customizable loader which `require()`s `executableFile`,
                  // expecting a single exported function which it uses to transform the on-disk module data.
                  // The stub loader, `src/env/loader.js`, simply takes a `code` function as an option and
                  // and replaces the module data with its result.
                  //
                  // Webpack requires both the module being loaded and the stub loader to exist as actual files
                  // on the filesystem, but this setup allows the actual content of a module to be generated
                  // at compile time.
                  use: [
                    {
                      loader: 'val-loader',
                      options: {
                        executableFile: require.resolve(path.join(buildPath, 'src/env/loader.js')),
                        code() {
                          return stableStringify(
                            Object.fromEntries(
                              Object.entries(env).filter(([k]) => k.startsWith('REACT_APP_')),
                            ),
                          )
                        },
                      },
                    },
                  ],
                  // The type ['asset/resource'](https://webpack.js.org/guides/asset-modules/#resource-assets)
                  // tells Webpack to a special generator that will emit the module as a separate file instead
                  // of inlining its contents into another chunk, as well as skip the normal plugin processing
                  // and minification steps and just write the raw as-loaded contents. The `generator.filename`
                  // option overrides the default output path so that the file ends up at `build/env.json`
                  // instead of the default `build/static/media/env.[hash].json`.
                  type: 'asset/resource',
                  generator: {
                    filename: '[base]',
                  },
                },
              ],
            },
            // We can't use `fetch()` to load `env.json` when running tests because Jest doesn't do top-level await.
            // We can't manually mock out the fetch because we'd either have to turn on automock, which mocks *everything*
            // and breaks a lot of stuff, or call `jest.mock()`, which doesn't exist in the browser. It can't be called
            // conditionally because that breaks Jest's magic hoisting BS, and we can't polyfill it because the existence
            // of a global `jest` object causes various things to think they're being tested and complain that their
            // "test harnesses" aren't set up correctly.
            //
            // Instead, we leave the jest-friendly behavior as the "default", and use this alias to swap in the behavior
            // we want to happen in the browser during the build of the webpack bundle.
            resolve: {
              alias: {
                [path.join(buildPath, 'src/env/index.ts')]: path.join(
                  buildPath,
                  'src/env/webpack.ts',
                ),
              },
            },
            experiments: {
              topLevelAwait: true,
            },
          }
        : {},
    )

    //patch for electron
    config.target = 'electron-renderer'

    return config
  },
  devServer: (configFunction: DevServerConfigFunction): DevServerConfigFunction => {
    return (...args) => {
      const config = configFunction(...args)
      config.headers = headers
      return config
    }
  },
}

// eslint-disable-next-line import/no-default-export
export default reactAppRewireConfig
