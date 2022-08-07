import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    'https://api.gmp.axelarscan.io',
    'https://nest-server-mainnet.axelar.dev',
    'wss://nest-server-mainnet.axelar.dev',
    'https://axelar-lcd.quickapi.com/',
  ],
}
