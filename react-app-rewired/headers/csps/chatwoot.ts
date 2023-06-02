import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': [process.env.REACT_APP_CHATWOOT_URL!],
  'script-src': [process.env.REACT_APP_CHATWOOT_URL!],
  'frame-src': [process.env.REACT_APP_CHATWOOT_URL!],
}
