import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.NODE_ENV || 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_ARBITRUM_NOVA_NODE_URL!,
    env.VITE_UNCHAINED_ARBITRUM_NOVA_HTTP_URL!,
    env.VITE_UNCHAINED_ARBITRUM_NOVA_WS_URL!,
    'https://nova.arbitrum.io/rpc',
  ],
}
