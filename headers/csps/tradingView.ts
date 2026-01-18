import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': ['https://saveload.tradingview.com', 'https://*.tradingview.com'],
  'font-src': ["'self'", 'data:'],
  'style-src': ["'self'", 'https://saveload.tradingview.com', 'https://*.tradingview.com'],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://saveload.tradingview.com',
    'https://*.tradingview.com',
  ],
}
