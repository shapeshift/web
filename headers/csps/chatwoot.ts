import { loadEnv } from 'vite'

import { determineMode } from '../../utils'
import type { Csp } from '../types'

const mode = determineMode()
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_CHATWOOT_URL!],
  'script-src': [env.VITE_CHATWOOT_URL!],
  'frame-src': [env.VITE_CHATWOOT_URL!],
}
