import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    env.VITE_KEEPKEY_VERSIONS_URL,
    env.VITE_KEEPKEY_DESKTOP_URL,
    env.VITE_KEEPKEY_LATEST_RELEASE_URL,
  ],
}
