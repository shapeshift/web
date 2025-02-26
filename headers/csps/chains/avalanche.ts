import { loadEnv } from 'vite'

import { determineMode } from '../../../utils'
import type { Csp } from '../../types'

const mode = determineMode()
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_AVALANCHE_NODE_URL!,
    env.VITE_UNCHAINED_AVALANCHE_HTTP_URL!,
    env.VITE_UNCHAINED_AVALANCHE_WS_URL!,
    'https://api.avax.network/ext/bc/C/rpc',
  ],
}
