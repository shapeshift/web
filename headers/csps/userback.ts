import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': ['https://*.userback.io', 'https://*.hcaptcha.com'],
  'script-src': ['https://static.userback.io', 'https://js.hcaptcha.com', 'https://hcaptcha.com'],
  'style-src': ['https://*.userback.io', 'https://hcaptcha.com'],
  'img-src': ['https://*.userback.io'],
  'frame-src': ['https://*.userback.io', 'https://*.hcaptcha.com'],
  'font-src': ['https://*.userback.io'],
}
