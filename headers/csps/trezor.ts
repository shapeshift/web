import type { Csp } from '../types'

export const csp: Csp = {
  'frame-src': ['https://connect.trezor.io/'],
  'connect-src': [
    // Trezor Suite
    'ws://127.0.0.1:21335/connect-ws',
  ],
}
