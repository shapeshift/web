/**
 * React App Rewired Config
 */
const headers = require('./headers')
process.env.REACT_APP_CSP_META = headers.cspMeta ?? ''

module.exports = {
  devServer: configFunction => {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost)
      config.headers = headers.headers
      return config
    }
  }
}
