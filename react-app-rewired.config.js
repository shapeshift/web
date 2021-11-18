/**
 * React App Rewired Config
 */
module.exports = {
  devServer: configFunction => {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost)
      config.headers = {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Permissions-Policy': 'document-domain=()',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }
      return config
    }
  }
}
