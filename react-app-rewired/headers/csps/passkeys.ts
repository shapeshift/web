import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': ['https://embedded.passkeys.foundation/'],
  'frame-src': ['https://embedded.passkeys.foundation/'],
  'frame-ancestors': ['https://embedded.passkeys.foundation/'],
}
