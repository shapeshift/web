import { loadEnv } from 'vite'

import { determineMode } from '../../../utils'
import type { Csp } from '../../types'

const mode = determineMode()
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_UNCHAINED_COSMOS_HTTP_URL!, env.VITE_UNCHAINED_COSMOS_WS_URL!],
  'img-src': [
    'https://raw.githubusercontent.com/cosmostation/',
    'https://raw.githubusercontent.com/cosmos/chain-registry/',
  ],
}
