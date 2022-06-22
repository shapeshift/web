import type { Csp } from '../../../types'

export const csp: Csp = {
  'connect-src': [process.env.REACT_APP_OSMOSIS_NODE!, process.env.REACT_APP_COSMOS_NODE!],
}
