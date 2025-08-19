import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': [
    'https://api.proxy.shapeshift.com/api/v1/',
    'https://dev-api.proxy.shapeshift.com/api/v1/',
    'ws://api.proxy.localhost/',
    'wss://api.proxy.shapeshift.com/',
    'wss://dev-api.proxy.shapeshift.com/',
  ],
}
