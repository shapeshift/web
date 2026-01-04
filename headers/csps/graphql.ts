import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': ['http://localhost:4000/graphql', 'ws://localhost:4000/graphql'],
}
