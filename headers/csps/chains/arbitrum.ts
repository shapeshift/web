import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_ARBITRUM_NODE_URL!,
    env.VITE_UNCHAINED_ARBITRUM_HTTP_URL!,
    env.VITE_UNCHAINED_ARBITRUM_WS_URL!,
    'https://arbitrum.llamarpc.com',
  ],
}
