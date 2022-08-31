import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [process.env.REACT_APP_ONRAMPER_API_URL!, process.env.REACT_APP_ONRAMPER_WIDGET_URL!],
}
