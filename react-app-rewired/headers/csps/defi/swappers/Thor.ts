import type { Csp } from '../../../types'

export const csp: Csp = {
  // removes `/v2` from midgard url
  'connect-src': [String(process.env.REACT_APP_MIDGARD_URL).slice(0, -3)],
}
