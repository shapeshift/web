import { loadEnv } from 'vite'

import { determineMode } from '../../../../utils'
import type { Csp } from '../../../types'

const mode = determineMode()
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  // removes `/v2` from midgard url
  'connect-src': [String(env.VITE_MIDGARD_URL).slice(0, -3)],
}
