import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '')

export const csp: Csp = {
  'connect-src': [env.VITE_ONRAMPER_API_URL!, env.VITE_ONRAMPER_WIDGET_URL!],
}
