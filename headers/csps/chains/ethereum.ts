import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_ETHEREUM_NODE_URL!,
    env.VITE_UNCHAINED_ETHEREUM_HTTP_URL!,
    env.VITE_UNCHAINED_ETHEREUM_WS_URL!,
    env.VITE_ALCHEMY_POLYGON_URL!,
    'https://eth.llamarpc.com',
  ],
}
