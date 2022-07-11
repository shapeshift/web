import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [process.env.REACT_APP_JUNOPAY_BASE_API_URL!],
  'img-src': [process.env.REACT_APP_JUNOPAY_ASSET_LOGO_URL!],
}
