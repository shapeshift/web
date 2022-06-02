import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // friendly-challenge@0.9.1: https://github.com/FriendlyCaptcha/friendly-challenge/blob/f110634f17f316b90a9bd59b190291abe3c639bb/src/captcha.ts#L20
    'https://api.friendlycaptcha.com/api/v1/puzzle',
    process.env.REACT_APP_WALLET_MIGRATION_URL!,
  ],
}
