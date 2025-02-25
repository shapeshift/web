import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    'https://raw.githack.com/keepkey/keepkey-desktop/master/firmware/releases.json',
    'https://api.github.com/repos/keepkey/keepkey-desktop/releases/latest',
    process.env.REACT_APP_KEEPKEY_VERSIONS_URL!,
    process.env.REACT_APP_KEEPKEY_DESKTOP_URL!,
  ],
}
