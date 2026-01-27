import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': [
    'https://static.userback.io',
    'https://api.userback.io',
    'https://*.userback.io',
    'https://hcaptcha.com',
    'https://*.hcaptcha.com',
  ],
  'script-src': ['https://static.userback.io', 'https://js.hcaptcha.com', 'https://hcaptcha.com'],
  'style-src': ['https://static.userback.io', 'https://*.userback.io', 'https://hcaptcha.com'],
  'img-src': ['https://static.userback.io', 'https://*.userback.io'],
  'frame-src': [
    'https://static.userback.io',
    'https://*.userback.io',
    'https://hcaptcha.com',
    'https://*.hcaptcha.com',
    'https://newassets.hcaptcha.com',
  ],
  'font-src': ['https://static.userback.io', 'https://*.userback.io'],
}
