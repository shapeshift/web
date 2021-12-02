/**
 * React App Rewired Config
 */
const headers = require('./headers')
process.env.REACT_APP_CSP_META = headers.cspMeta ?? ''

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
  webpack: config => {
    // Cloudflare Pages has a max asset size of 25 MiB. Without limiting the chunk size,
    // generated chunks or source maps may exceed this limit. 8 MiB seems to keep the max
    // gzipped chunk size ~1MiB and the max source map size ~12MiB, which avoids tripping
    // CRA's "The bundle size is significantly larger than recommended" warning.
    //
    // This file isn't transpiled, and might be run in node 14, which doesn't support ??=,
    // ??, or even ||=.
    config.optimization = config.optimization || {}
    config.optimization.splitChunks = config.optimization.splitChunks || {}
    config.optimization.splitChunks.maxSize = 8 * 1024 * 1024

    // This will be unnessecary in react-scripts ^4.1
    // ref: https://github.com/facebook/create-react-app/issues/8096#issuecomment-751894155
    // ref: https://github.com/facebook/create-react-app/pull/10004#issuecomment-871945665
    // ref: https://github.com/facebook/create-react-app/issues/7135#issuecomment-497102755
    switch (process.env.NODE_ENV) {
      case 'production': {
        config.plugins = config.plugins.filter(plugin => {
          return plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
        })
        break
      }
      default: {
        const forkTsCheckerWebpackPlugin = config.plugins.find(plugin => {
          return plugin.constructor.name === 'ForkTsCheckerWebpackPlugin'
        })
        forkTsCheckerWebpackPlugin.memoryLimit = 4096
        break
      }
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
