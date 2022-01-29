/**
 * React App Rewired Config
 */
const stableStringify = require('fast-json-stable-stringify')
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const ssri = require('ssri')
const webpack = require('webpack')
const { SubresourceIntegrityPlugin } = require('webpack-subresource-integrity')

const headers = require('./headers')
process.env.REACT_APP_CSP_META = headers.cspMeta ?? ''

// The HTML template can pull in static assets from outside of the Webpack
// pipeline; these need SRI too. This generates SRI attributes for each static
// asset, exporting them as predictably-named REACT_APP_SRI_FILENAME_EXT
// environment variables that can be used in the template.
for (const dirent of fs.readdirSync('./public', { withFileTypes: true })) {
  if (!dirent.isFile()) continue
  const integrity = ssri.fromData(fs.readFileSync(`./public/${dirent.name}`), {
    strict: true,
    algorithms: ['sha256']
  })
  const mungedName = dirent.name
    .toUpperCase()
    .split('')
    .map(x => (/^[0-9A-Z]$/.test(x) ? x : '_'))
    .join('')
  process.env[`REACT_APP_SRI_${mungedName}`] = integrity.toString()
}

module.exports = {
  webpack: (config, mode) => {
    const isProduction = mode === 'production'
    const isDevelopment = mode === 'development'

    // Initialize top-level arrays just in case they're missing for some reason.
    _.merge(config, {
      plugins: [],
      ignoreWarnings: []
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
          stream: require.resolve('stream-browserify'),
          zlib: require.resolve('browserify-zlib')
        }
      },
      // Also provide polyfills for some Node globals.
      plugins: [
        ...config.plugins,
        new webpack.ProvidePlugin({
          Buffer: ['buffer/', 'Buffer'],
          process: ['process/browser.js']
        })
      ]
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
                maxSize: 6 * 1024 * 1024
              },
              // This uses numerically-ascending chunk IDs with no gaps, a la Webpack 4. Webpack 5
              // numbers chunks differently, and it's not obvious that they're deterministic. If
              // we can determine that chunk ids are deterministic without this option, it can go.
              chunkIds: 'natural'
            }
          }
        : undefined
    )

    // Webpack uses MD4 by default, but SHA-256 can be verified with standard tooling.
    _.merge(config, {
      output: {
        hashFunction: 'sha256'
      }
    })

    // Ignore warnings raised by source-map-loader. Some third party packages ship misconfigured
    // sourcemap paths and cause many spurious warnings.
    //
    // Removable when https://github.com/facebook/create-react-app/pull/11752 is merged upstream.
    _.merge(config, {
      ignoreWarnings: [
        ...config.ignoreWarnings,
        function ignoreSourceMapLoaderWarnings(warning) {
          return (
            warning.module?.resource?.includes?.('node_modules') &&
            warning.details?.includes?.('source-map-loader')
          )
        }
      ]
    })

    // Remove synthetic CSP/SRI environment variables from DefinePlugin.
    _.merge(config, {
      plugins: config.plugins.map(plugin => {
        if (plugin.constructor.name !== 'DefinePlugin') return plugin

        const definitions = JSON.parse(JSON.stringify(plugin.definitions))
        const env = definitions['process.env'] || {}

        for (const key in env) {
          if (/^REACT_APP_(CSP|SRI)_.*$/.test(key)) delete env[key]
        }

        return new webpack.DefinePlugin(definitions)
      })
    })

    // Generate and embed Subresource Integrity (SRI) attributes for all files.
    // Automatically embeds SRI hashes when generating the embedded webpack loaders
    // for split code.
    _.merge(config, {
      output: {
        // This is the default, but the SRI spec requires it to be set explicitly.
        crossOriginLoading: 'anonymous'
      },
      // SubresourceIntegrityPlugin automatically disables itself in development.
      plugins: [
        ...config.plugins,
        new SubresourceIntegrityPlugin({
          hashFuncNames: ['sha256']
        })
      ]
    })

    // Collect env vars that would have been injected via DefinePlugin. We will emit them
    // as dynamically-loaded JSON later instead of find/replacing the string 'process.env'.
    // This ensures that the minified Webpack output will be the same no matter the build
    // options being used.
    const env = Object.fromEntries(
      Object.entries(
        config.plugins
          .filter(plugin => plugin.constructor.name === 'DefinePlugin')
          .reduceRight(x => x).definitions?.['process.env'] || {}
      )
        .filter(([, v]) => v)
        .map(([k, v]) => [k, JSON.parse(v)])
    )
    // Update the Webpack config to emit the collected env vars as `env.json` and load them
    // dynamically instead of baking them into each chunk that might reference them.
    _.merge(
      config,
      isProduction
        ? {
            plugins: [
              ...config.plugins.map(plugin => {
                switch (plugin.constructor.name) {
                  case 'DefinePlugin': {
                    // Remove all REACT_APP_* 'process.env' entries from DefinePlugin; these will
                    // be pulled from env.json via src/config.ts and src/env/index.ts.
                    if (
                      Object.keys(plugin.definitions).filter(x => x !== 'process.env').length !== 0
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
                        })
                    )
                    console.info('Embedded environment vars:', definitions)
                    return new webpack.DefinePlugin(
                      Object.fromEntries(
                        Object.entries(definitions).map(([k, v]) => [
                          `process.env.${k}`,
                          JSON.stringify(v)
                        ])
                      )
                    )
                  }
                  default:
                    return plugin
                }
              })
            ],
            module: {
              rules: [
                ...config.module?.rules,
                {
                  // This rule causes the (placeholder) contents of `src/env/env.json` to be thrown away
                  // and replaced with `stableStringify(env)`, which is then written out to `build/env.json`.
                  //
                  // Note that simply adding this rule doesn't force `env.json` to be generated. That happens
                  // because `src/env/process.js` `require()`s it, and that module is provided via ProvidePlugin
                  // above. If nothing ever uses that `process` global, both `src/env/process.js` and `env.json`
                  // will be omitted from the build.
                  resource: path.join(__dirname, 'src/env/env.json'),
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
                        executableFile: require.resolve(path.join(__dirname, 'src/env/loader.js')),
                        code() {
                          return stableStringify(
                            Object.fromEntries(
                              Object.entries(env).filter(([k]) => k.startsWith('REACT_APP_'))
                            )
                          )
                        }
                      }
                    }
                  ],
                  // The type ['asset/resource'](https://webpack.js.org/guides/asset-modules/#resource-assets)
                  // tells Webpack to a special generator that will emit the module as a separate file instead
                  // of inlining its contents into another chunk, as well as skip the normal plugin processing
                  // and minification steps and just write the raw as-loaded contents. The `generator.filename`
                  // option overrides the default output path so that the file ends up at `build/env.json`
                  // instead of the default `build/static/media/env.[hash].json`.
                  type: 'asset/resource',
                  generator: {
                    filename: '[base]'
                  }
                }
              ]
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
                [path.join(__dirname, 'src/env/index.ts')]: path.join(
                  __dirname,
                  'src/env/webpack.ts'
                )
              }
            },
            experiments: {
              topLevelAwait: true
            }
          }
        : {}
    )

    // Remove data-test="" attributes from production builds
    //
    //   data-test attributes are used as unique identifiers in  cypress integration and e2e tests.
    //   They aren't needed in production and
    //     a) only bump up the bundle size, as well as
    //     b) make it stupidly easy for potential bot authors
    //        to automate site interactions.
    //        (After all, that automation is what cypress tests do)
    if (isProduction) {
      const oneOfLoaders = config.module.rules.find(rule => Array.isArray(rule.oneOf))?.oneOf
      const babelLoader = oneOfLoaders.find(rule => rule.loader?.includes('babel-loader'))
      babelLoader.options.plugins.push(['react-remove-properties', { properties: ['data-test'] }])
    }

    return config
  },
  devServer: configFunction => {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost)
      config.headers = headers.headers
      return config
    }
  }
}
