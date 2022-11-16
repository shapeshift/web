import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_UNCHAINED_COSMOS_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_COSMOS_WS_URL!,
    process.env.REACT_APP_COSMOS_NODE_URL!,
  ],
  'img-src': [
    'https://raw.githubusercontent.com/cosmostation/',
    'https://raw.githubusercontent.com/cosmos/chain-registry/',
  ],
}
