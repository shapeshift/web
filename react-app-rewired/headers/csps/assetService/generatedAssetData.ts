import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    'https://raw.githack.com/shapeshift/web/*',
    'https://raw.githack.com/shapeshift/web/develop/src/lib/asset-service/service/relatedAssetIndex.json',
  ],
}
