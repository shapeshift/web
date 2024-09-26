const tsNode = require('ts-node')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

tsNode.register({
  extends: './tsconfig.web.json',
  include: ['src'],
  exclude: ['packages'],
  compilerOptions: {
    module: 'CommonJS',
  },
})

const rewiredConfig = require('./react-app-rewired').default

module.exports = function override(config, env) {
  // Apply the existing rewired configuration
  config = rewiredConfig(config, env)

  // Add the BundleAnalyzerPlugin if ANALYZE is true
  if (process.env.ANALYZE === 'true') {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        analyzerPort: 8888,
        openAnalyzer: true,
      }),
    )
  }

  return config
}
