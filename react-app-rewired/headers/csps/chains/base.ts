import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_BASE_NODE_URL!,
    process.env.REACT_APP_UNCHAINED_BASE_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_BASE_WS_URL!,
    'https://base.llamarpc.com',
  ],
}
