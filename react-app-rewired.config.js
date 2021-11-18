/**
 * React App Rewired Config
 */
process.env.REACT_APP_CSP = require('./headers')['Content-Security-Policy'] ?? ''

module.exports = {
  devServer: configFunction => {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost)
      config.headers = require('./headers')
      return config
    }
  }
}
