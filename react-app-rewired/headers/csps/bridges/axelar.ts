import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    'https://api.gmp.axelarscan.io',
    'https://nest-server-mainnet.axelar.dev',
    'wss://nest-server-mainnet.axelar.dev',
    // https://axelar-lcd.quickapi.com does not correctly return CORS headers. A proxy was made to add them.
    'https://9bo26t9rjb.execute-api.ap-southeast-2.amazonaws.com/apotheosis',
  ],
}
