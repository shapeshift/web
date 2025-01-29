import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_ARBITRUM_NODE_URL!,
    process.env.REACT_APP_UNCHAINED_ARBITRUM_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_ARBITRUM_WS_URL!,
    'https://arbitrum.llamarpc.com',
  ],
}
