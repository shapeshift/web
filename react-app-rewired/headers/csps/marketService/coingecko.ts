import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // markets.shapeshift.com is a coingecko proxy maintained by the fox foundation
    'https://markets.shapeshift.com',
    // 'http://localhost:1137', needed when using local market proxy
  ],
  'img-src': ['https://assets.coingecko.com/coins/images/'],
}
