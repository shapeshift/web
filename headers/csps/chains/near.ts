import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_NEAR_NODE_URL,
    env.VITE_NEAR_NODE_URL_FALLBACK_1,
    env.VITE_NEAR_NODE_URL_FALLBACK_2,
    env.VITE_NEARBLOCKS_API_URL,
  ].filter(Boolean),
}
