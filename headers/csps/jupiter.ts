import { JUPITER_BASE_API_URL } from '../../../src/constants/urls'
import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': [JUPITER_BASE_API_URL],
}
