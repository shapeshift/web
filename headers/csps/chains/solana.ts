import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_UNCHAINED_SOLANA_HTTP_URL,
    env.VITE_UNCHAINED_SOLANA_WS_URL,
    env.VITE_SOLANA_NODE_URL,
    // Jito Block Engine for enhanced tx submission and atomic bundles
    env.VITE_JITO_BLOCK_ENGINE_URL,
    // Jito tip floor REST API (separate domain from block engine)
    'https://bundles.jito.wtf',
  ],
}
