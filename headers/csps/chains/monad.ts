import { loadEnv } from 'vite'

import type { Csp } from '../../types'
import { FALLBACK_RPC_URLS } from './fallbackRpcUrls'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_MONAD_NODE_URL, ...FALLBACK_RPC_URLS.monad],
}
