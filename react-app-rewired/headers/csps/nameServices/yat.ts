import type { Csp } from '../../types'

// Simple proxy server to avoid cors and security error thrown by yat when calling the api directly
export const csp: Csp = {
  'connect-src': [process.env.REACT_APP_YAT_NODE_URL!],
}
