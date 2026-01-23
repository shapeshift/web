import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': ['https://static.userback.io', 'https://api.userback.io', 'https://*.userback.io'],
  'script-src': ['https://static.userback.io'],
  'style-src': ['https://static.userback.io', 'https://*.userback.io'],
  'img-src': ['https://static.userback.io', 'https://*.userback.io'],
  'frame-src': ['https://static.userback.io', 'https://*.userback.io'],
  'font-src': ['https://static.userback.io', 'https://*.userback.io'],
}
