import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    process.env.REACT_APP_KEEPKEY_FIRMWARE_RELEASES_URL!,
    process.env.REACT_APP_KEEPKEY_GITHUB_RELEASES_API_URL!,
    process.env.REACT_APP_KEEPKEY_VERSIONS_URL!,
    process.env.REACT_APP_KEEPKEY_DESKTOP_URL!,
  ],
}
