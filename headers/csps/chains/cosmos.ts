import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_UNCHAINED_COSMOS_HTTP_URL!, env.VITE_UNCHAINED_COSMOS_WS_URL!],
  'img-src': [
    'https://raw.githubusercontent.com/cosmostation/',
    'https://raw.githubusercontent.com/cosmos/chain-registry/',
  ],
}
