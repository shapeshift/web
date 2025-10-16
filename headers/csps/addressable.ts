import { loadEnv } from 'vite'

import type { Csp } from '../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

const isEnabled = env.VITE_ENABLE_ADDRESSABLE === 'true'

export const csp: Csp = isEnabled
  ? {
      'script-src': ['https://tag.adrsbl.io'],
      'connect-src': ['https://tag.adrsbl.io'],
      'img-src': ['https://tag.adrsbl.io'],
    }
  : {}
