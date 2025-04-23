import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // @shapeshiftoss/caip@1.7.0: https://github.com/shapeshift/lib/blob/5a378b186bf943c9f5e5342e1333b9fbc7c0deaf/packages/caip/src/adapters/coincap/index.ts#L5
    'https://rest.coincap.io/v3/assets',
    // lib/market-service/src/coincap/coincap.ts
    'https://rest.coincap.io/v3/assets/',
  ],
  'img-src': ['https://assets.coincap.io/assets/icons/', 'https://static.coincap.io/assets/icons/'],
}
