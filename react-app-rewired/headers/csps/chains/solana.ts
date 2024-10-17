import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_UNCHAINED_SOLANA_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_SOLANA_WS_URL!,
    process.env.REACT_APP_SOLANA_NODE_URL!,
  ],
}
