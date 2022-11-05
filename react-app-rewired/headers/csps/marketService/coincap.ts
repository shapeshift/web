import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // @keepkey/caip@1.7.0: https://github.com/shapeshift/lib/blob/5a378b186bf943c9f5e5342e1333b9fbc7c0deaf/packages/caip/src/adapters/coincap/index.ts#L5
    'https://api.coincap.io/v2/assets',
    // @keepkey/market-service@1.7.0: https://github.com/shapeshift/lib/blob/9123527ebbcf0fd62a619ab2824d970123bd5ac2/packages/market-service/src/coincap/coincap.ts#L21
    'https://api.coincap.io/v2/assets/',
  ],
  'img-src': ['https://assets.coincap.io/assets/icons/', 'https://static.coincap.io/assets/icons/'],
}
