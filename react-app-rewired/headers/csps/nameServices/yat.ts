import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [process.env.REACT_APP_YAT_NODE_URL!],
}
