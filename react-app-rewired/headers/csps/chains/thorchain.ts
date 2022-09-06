import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_UNCHAINED_THORCHAIN_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_THORCHAIN_WS_URL!,
    process.env.REACT_APP_THORCHAIN_NODE_URL!,
  ],
}
