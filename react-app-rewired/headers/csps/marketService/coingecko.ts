import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // @keepkey/caip@1.6.1: https://github.com/shapeshift/lib/blob/1689995812e81a866e2c60150bdbb9afc7ce32b9/packages/caip/src/adapters/coingecko/index.ts#L5
    // @keepkey/asset-service@1.10.0: https://github.com/shapeshift/lib/blob/636c6c9460ac5ae4d1189165eddd3a105406e0ef/packages/asset-service/src/service/AssetService.ts#L130
    // @keepkey/market-service@1.7.0: https://github.com/shapeshift/lib/blob/9123527ebbcf0fd62a619ab2824d970123bd5ac2/packages/market-service/src/coingecko/coingecko.ts#L37
    'https://api.coingecko.com',
    // @keepkey/market-service@v4.5.0: https://github.com/shapeshift/lib/blob/9a301396646089fdc1c08626d82868461e46221e/packages/market-service/src/coingecko/coingecko.ts#L42
    'https://pro-api.coingecko.com',
  ],
  'img-src': ['https://assets.coingecko.com/coins/images/'],
}
