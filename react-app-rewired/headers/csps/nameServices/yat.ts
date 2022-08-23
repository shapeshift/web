import type { Csp } from '../../types'

// Simple proxy server to avoid cors and security error thrown by yat when calling the api directly
export const csp: Csp = {
  'connect-src': ['https://octopus-app-mkjlj.ondigitalocean.app'],
}
