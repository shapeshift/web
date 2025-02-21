import type { Csp } from '../types'

const REACT_APP_CHATWOOT_URL = process.env.REACT_APP_CHATWOOT_URL

if (!REACT_APP_CHATWOOT_URL) throw new Error('REACT_APP_CHATWOOT_URL is required')

export const csp: Csp = {
  'connect-src': [REACT_APP_CHATWOOT_URL],
  'script-src': [REACT_APP_CHATWOOT_URL],
  'frame-src': [REACT_APP_CHATWOOT_URL],
}
