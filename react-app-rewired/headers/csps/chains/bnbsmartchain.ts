import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_BNBSMARTCHAIN_NODE_URL!,
    process.env.REACT_APP_UNCHAINED_BNBSMARTCHAIN_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_BNBSMARTCHAIN_WS_URL!,
    'https://binance.llamarpc.com',
  ],
}
