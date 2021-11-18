/**
 * React App Rewired Config
 */
const headers = require('./headers')
process.env.REACT_APP_CSP = headers['Content-Security-Policy'] ?? ''

module.exports = {
  devServer: configFunction => {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost)
      config.headers = require('./headers')
      return config
    }
  }
}
