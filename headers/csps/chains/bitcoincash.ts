import { loadEnv } from 'vite'

import { determineMode } from '../../../utils'
import type { Csp } from '../../types'

const mode = determineMode()
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_UNCHAINED_BITCOINCASH_HTTP_URL!, env.VITE_UNCHAINED_BITCOINCASH_WS_URL!],
}
