import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_BASE_NODE_URL,
    env.VITE_UNCHAINED_BASE_HTTP_URL,
    env.VITE_UNCHAINED_BASE_WS_URL,
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base.blockpi.network',
  ],
}
