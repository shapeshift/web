/**
 * React App Rewired Config
 */
const stableStringify = require('fast-json-stable-stringify')
const _ = require('lodash')
const path = require('path')
const webpack = require('webpack')

const headers = require('./headers')
process.env.REACT_APP_CSP_META = headers.cspMeta ?? ''

module.exports = {
  webpack: (config, mode) => {
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
          stream: require.resolve('stream-browserify'),
          zlib: require.resolve('browserify-zlib'),
        }
      },
      // Also provide polyfills for some Node globals.
      plugins: [...config.plugins, new webpack.ProvidePlugin({
        Buffer: ['buffer/', 'Buffer'],
        process: ['process/browser.js'],
      })]
    })

    // Cloudflare Pages has a max asset size of 25 MiB. Without limiting the chunk size,
    // generated chunks or source maps may exceed this limit. 6 MiB seems to keep the max
    // gzipped chunk size ~1MiB and the max source map size ~8MiB, which avoids tripping
    // CRA's "The bundle size is significantly larger than recommended" warning.
    _.merge(config, isProduction ? {
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
      }
    } : undefined)

    // Webpack uses MD4 by default, but SHA-256 can be verified with standard tooling.
    _.merge(config, {
      output: {
        hashFunction: 'sha256',
      }
    })

    // Ignore warnings raised by source-map-loader. Some third party packages ship misconfigured
    // sourcemap paths and cause many spurious warnings.
    //
    // Removable when https://github.com/facebook/create-react-app/pull/11752 is merged upstream.
    _.merge(config, {
      ignoreWarnings: [...config.ignoreWarnings, 
        function ignoreSourceMapLoaderWarnings(warning) {
          return (
            warning.module?.resource?.includes?.('node_modules') &&
            warning.details?.includes?.('source-map-loader')
          );
        }
      ],
    })

    // Collect env vars that would have been injected via DefinePlugin. We will emit them
    // as dynamically-loaded JSON later instead of find/replacing the string 'process.env'.
    // This ensures that the minified Webpack output will be the same no matter the build
    // options being used.
    const env = Object.fromEntries(
      Object.entries(
        config.plugins
          .filter((plugin) => plugin.constructor.name === "DefinePlugin")
          .reduceRight((x) => x).definitions?.["process.env"] || {}
      ).filter(([k, v])=> v).map(([k, v]) => [k, JSON.parse(v)])
    );
    // Update the Webpack config to emit the collected env vars as `env.json` and load them
    // dynamically instead of baking them into each chunk that might reference them.
    _.merge(config, {
      plugins: [...config.plugins.map(plugin => {
        switch (plugin.constructor.name) {
          case 'DefinePlugin': {
            // Remove the 'process.env' entry from DefinePlugin; this will cause `process.env` to
            // resolve via the ProvidePlugin `process` global.
            delete plugin.definitions['process.env']
            return plugin
          }
          case 'ProvidePlugin': {
            // This is a thin wrapper around the process/browser.js module, which inserts the
            // contents of `env.json` into `process.env` and freezes the object to prevent
            // attacks on any code that might expect its environment variables to be immutable.
            return new webpack.ProvidePlugin(Object.assign({}, plugin.definitions, {
              process: [ path.join(__dirname, 'src/env/process.js') ],
            }))
          }
          default: return plugin
        }
      })],
      module: {
        rules: [...config.module?.rules, {
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
          use: [{
            loader: 'val-loader',
            options: {
              executableFile: require.resolve(path.join(__dirname, 'src/env/loader.js')),
              code: () => stableStringify(env),
            },
          }],
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
        }]
      },
    })

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
