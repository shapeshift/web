import { loadEnv } from 'vite'

import type { Csp } from '../../types'

const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

export const csp: Csp = {
  'connect-src': [
    // friendly-challenge@0.9.1: https://github.com/FriendlyCaptcha/friendly-challenge/blob/f110634f17f316b90a9bd59b190291abe3c639bb/src/captcha.ts#L20
    'https://api.friendlycaptcha.com/api/v1/puzzle',
    env.VITE_WALLET_MIGRATION_URL!,
  ],
}
