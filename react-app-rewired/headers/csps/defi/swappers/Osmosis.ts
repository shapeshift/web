import type { Csp } from '../../../types'

export const csp: Csp = {
  'connect-src': [process.env.REACT_APP_OSMO_NODE!, process.env.REACT_APP_ATOM_NODE!],
}
