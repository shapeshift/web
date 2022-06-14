import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_ETHEREUM_NODE_URL!,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_ETHEREUM_WS_URL!,
    'https://polygon-mainnet.infura.io/',
  ],
}
