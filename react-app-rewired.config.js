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
  devServer: configFunction => {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost)
      config.headers = headers.headers
      return config
    }
  }
}
