import type { Csp } from '../../types'

const REACT_APP_BASE_NODE_URL = process.env.REACT_APP_BASE_NODE_URL
const REACT_APP_UNCHAINED_BASE_HTTP_URL = process.env.REACT_APP_UNCHAINED_BASE_HTTP_URL
const REACT_APP_UNCHAINED_BASE_WS_URL = process.env.REACT_APP_UNCHAINED_BASE_WS_URL

if (!REACT_APP_BASE_NODE_URL) throw new Error('REACT_APP_BASE_NODE_URL is required')
if (!REACT_APP_UNCHAINED_BASE_HTTP_URL)
  throw new Error('REACT_APP_UNCHAINED_BASE_HTTP_URL is required')
if (!REACT_APP_UNCHAINED_BASE_WS_URL) throw new Error('REACT_APP_UNCHAINED_BASE_WS_URL is required')

export const csp: Csp = {
  'connect-src': [
    REACT_APP_BASE_NODE_URL,
    REACT_APP_UNCHAINED_BASE_HTTP_URL,
    REACT_APP_UNCHAINED_BASE_WS_URL,
    'https://base.llamarpc.com',
  ],
}
