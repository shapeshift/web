import type { Csp } from '../types'

export const csp: Csp = {
  'default-src': ["'self'"],
  'child-src': ["'self'", 'blob:'],
  'connect-src': ["'self'", 'data:'],
  'img-src': ['*', "'self'", 'data:', 'blob:', 'filesystem:'],
  'script-src': [
    "'self'",
    'blob:',
    "'unsafe-eval'", //TODO: There are still a couple of libraries we depend on that use eval; notably amqp-ts and google-protobuf.
    "'unsafe-inline'", //TODO: The only inline code we need is the stub injected by Metamask. We can fix this by including the stub in our own bundle.
  ],
  'style-src': ["'self'", "'unsafe-inline'"],
  'base-uri': ["'none'"],
  'object-src': ["'none'"],
}
