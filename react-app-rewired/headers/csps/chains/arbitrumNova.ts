import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_ARBITRUM_NOVA_NODE_URL!,
    process.env.REACT_APP_UNCHAINED_ARBITRUM_NOVA_HTTP_URL!,
    process.env.REACT_APP_UNCHAINED_ARBITRUM_NOVA_WS_URL!,
    'https://nova.arbitrum.io/rpc',
  ],
}
