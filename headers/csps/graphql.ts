import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': [
    // GraphQL server for DataLoader batching (development only)
    'http://localhost:4000/graphql',
  ],
}
