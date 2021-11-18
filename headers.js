require('dotenv').config()

const headers = {
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
