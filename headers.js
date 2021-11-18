require('dotenv').config()

const cspMeta = Object.entries({
  'default-src': ["'self'"],
  'connect-src': [
    "'self'",
    'https://api.0x.org',
    'https://gas.api.0x.org',
    'https://api.coingecko.com',
    'https://api.yearn.finance',
    process.env.REACT_APP_ETHEREUM_NODE_URL,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
    process.env.REACT_APP_UNCHAINED_BITCOIN_HTTP_URL,
    process.env.REACT_APP_UNCHAINED_BITCOIN_WS_URL
  ],
  'frame-src': [
    'https://fwd.metamask.io/',
    'https://widget.portis.io'
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'filesystem:',
    'https://assets.coincap.io/assets/icons/',
    'https://static.coincap.io/assets/icons/',
    'https://assets.coingecko.com/coins/images/',
    'https://rawcdn.githack.com/yearn/yearn-assets/'
  ],
  'script-src': [
    "'self'",
    "'unsafe-eval'",  //TODO: There are still a couple of libraries we depend on that use eval; notably amqp-ts and google-protobuf.
    "'unsafe-inline'", //TODO: The only inline code we need is the stub injected by Metamask. We can fix this by including the stub in our own bundle.
    "'report-sample'"
  ],
  'style-src': ["'self'", "'unsafe-inline'", "'report-sample'"],
  'base-uri': ["'none'"],
  'object-src': ["'none'"]
})
  .map(([k, v]) => `${[k, ...v].join(' ')}`)
  .join('; ')

const headers = {
  'Content-Security-Policy': `${cspMeta}; frame-ancestors: 'none'`, // `; report-uri https://shapeshift.report-uri.com/r/d/csp/wizard`,
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'document-domain=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
}

module.exports = {
  headers,
  cspMeta
}
if (module.parent) return

require('fs').writeFileSync(
  './build/_headers',
  `/*\n${Object.entries(headers)
    .map(([k, v]) => `  ${k}: ${v}\n`)
    .join('')}`
)
