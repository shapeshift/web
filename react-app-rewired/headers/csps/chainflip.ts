import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': [
    'https://explorer-service-processor.chainflip.io/graphql',
    'https://chainflip-broker.io/',
  ],
}
