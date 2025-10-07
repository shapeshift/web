import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    'https://signing.gridpl.us',
    'https://lattice.gridplus.io',
    'https://gridplus.github.io',
    'https://www.4byte.directory',
    'https://api.arbiscan.io',
  ],
}
