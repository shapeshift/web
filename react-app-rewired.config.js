/**
 * React App Rewired Config
 */
const _ = require('lodash')
const path = require('path')
const webpack = require('webpack')

const headers = require('./headers')
process.env.REACT_APP_CSP_META = headers.cspMeta ?? ''

// This ensures environment variables will be enumerated in order, which affects the build products.
const reactEnvEntries = Object.entries(process.env)
  .filter(([k]) => k.startsWith('REACT_APP'))
  .sort((a, b) => {
    if (a[0] < b[0]) return -1
    if (a[0] > b[0]) return 1
    return 0
  })
reactEnvEntries.forEach(([k]) => delete process.env[k])
reactEnvEntries.forEach(([k, v]) => (process.env[k] = v))

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
