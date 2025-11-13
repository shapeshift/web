import type { Csp } from '../types'

export const csp: Csp = {
  'frame-src': ['https://connect.trezor.io/'],
  'connect-src': [
    // Trezor Bridge (standard port)
    'http://127.0.0.1:21325/',
    // Trezor Bridge (alternative port)
    'http://127.0.0.1:21328/',
    // Trezor Suite
    'ws://127.0.0.1:21335/connect-ws',
  ],
}
