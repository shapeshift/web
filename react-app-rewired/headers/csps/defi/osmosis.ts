import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_OSMOSIS_LCD_BASE_URL!,
    process.env.REACT_APP_OSMOSIS_IMPERATOR_BASE_URL!,
    process.env.REACT_APP_OSMOSIS_NODE_URL!,
  ],
}
