import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // lib/market-service/src/osmosis/osmosis.ts
    'https://api-osmosis.imperator.co/tokens/',
    process.env.REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_OSMOSIS_WS_URL!,
    process.env.REACT_APP_OSMOSIS_NODE_URL!,
  ],
  'img-src': ['https://raw.githubusercontent.com/osmosis-labs/'],
}
