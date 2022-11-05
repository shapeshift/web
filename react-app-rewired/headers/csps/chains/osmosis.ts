import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // @keepkey/market-service@2.0.0: https://github.com/shapeshift/lib/blob/1efccc3401eccb3125e1f09b7f829b886b457b89/packages/market-service/src/osmosis/osmosis.ts#L21
    'https://api-osmosis.imperator.co/tokens/',
    process.env.REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_OSMOSIS_WS_URL!,
    process.env.REACT_APP_OSMOSIS_NODE_URL!,
  ],
  'img-src': ['https://raw.githubusercontent.com/osmosis-labs/'],
}
