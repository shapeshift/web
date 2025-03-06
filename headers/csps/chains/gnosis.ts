import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_GNOSIS_NODE_URL,
    env.VITE_UNCHAINED_GNOSIS_HTTP_URL,
    env.VITE_UNCHAINED_GNOSIS_WS_URL,
    'https://rpc.gnosischain.com',
  ],
}
