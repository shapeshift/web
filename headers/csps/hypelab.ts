import { loadEnv } from 'vite'

import type { Csp } from '../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

const isEnabled = env.VITE_ENABLE_HYPELAB === 'true'

export const csp: Csp = isEnabled
  ? {
      'script-src': ['https://api.hypelab.com'],
      'connect-src': ['https://api.hypelab.com'],
    }
  : {}
