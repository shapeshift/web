/**
 * React App Rewired Config
 */
module.exports = {
  devServer: configFunction => {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost)
      config.headers = {}
      return config
    }
  }
}
