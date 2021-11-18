require('dotenv').config()

const csp = Object.entries({
  'default-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'connect-src': [
    "'self'",
    'https://api.0x.org',
    'https://api.coingecko.com',
    'https://api.yearn.finance',
    process.env.REACT_APP_ETHEREUM_NODE_URL,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
    process.env.REACT_APP_UNCHAINED_BITCOIN_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_BITCOIN_WS_URL
  ],
  'frame-src': ['https://widget.portis.io'],
  'img-src': [
    "'self'",
    'https://assets.coincap.io/assets/icons/',
    'https://assets.coingecko.com/coins/images/',
    'https://rawcdn.githack.com/yearn/yearn-assets/'
  ],
  'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'", "'report-sample'"],
  'style-src': ["'self'", "'unsafe-inline'", "'report-sample'"]
})
  .map(([k, v]) => `${[k, ...v].join(' ')}`)
  .join('; ')

const headers = {
  'Content-Security-Policy-Report-Only': `${csp}; report-uri https://shapeshift.report-uri.com/r/d/csp/wizard`,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'document-domain=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
}

module.exports = headers
if (module.parent) return

require('fs').writeFileSync(
  './build/_headers',
  `/*\n${Object.entries(headers)
    .map(([k, v]) => `  ${k}: ${v}\n`)
    .join('')}`
)
