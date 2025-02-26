import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.NODE_ENV || 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_BNBSMARTCHAIN_NODE_URL!,
    env.VITE_UNCHAINED_BNBSMARTCHAIN_HTTP_URL!,
    env.VITE_UNCHAINED_BNBSMARTCHAIN_WS_URL!,
    'https://binance.llamarpc.com',
  ],
}
